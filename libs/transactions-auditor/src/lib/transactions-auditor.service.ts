import { PageFactory, PaginateQuery, PaginateResponse } from '@emulienfou/nestjs-mikro-orm-paginate';
import { QueryOrder, raw } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { SqlEntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { UserInfo } from '@pistis/shared';

import {
    AssetPerformanceDto,
    AssetTimelineDto,
    MarketInsightsDto,
    PerformingAssetsDto,
    SalesVolumeDto,
    TimelinePointDto,
    TransactionAuditorDTO,
    VolumeChangeByGranularityDto,
    VolumeChangeDto,
    VolumeGranularity,
} from './dto';
import { AssetAggregate } from './interfaces';
import { TransactionsAuditor } from './transactions-auditor.entity';

@Injectable()
export class TransactionsAuditorService {
    constructor(
        @InjectRepository(TransactionsAuditor) private readonly repo: SqlEntityRepository<TransactionsAuditor>,
    ) {}

    async create(data: TransactionAuditorDTO): Promise<TransactionsAuditor> {
        const entity = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(entity);
        return entity;
    }

    async retrieveAll(query: PaginateQuery): Promise<PaginateResponse<TransactionAuditorDTO>> {
        return new PageFactory(query, this.repo).create();
    }

    async retrieveByFactory(
        query: PaginateQuery,
        user: UserInfo,
    ): Promise<PaginateResponse<Omit<TransactionAuditorDTO, 'terms'>>> {
        query.filter = {};

        return new PageFactory(query, this.repo, {
            // Explicitly select fields
            select: [
                'id',
                'transactionId',
                'transactionFee',
                'amount',
                'factoryBuyerId',
                'factoryBuyerName',
                'factorySellerId',
                'factorySellerName',
                'assetId',
                'assetName',
                'createdAt',
                'updatedAt',
                'terms',
            ],
            where: {
                $or: [{ factoryBuyerId: user.organizationId }, { factorySellerId: user.organizationId }],
            },
        }).create();
    }

    async getSumsByFactory(user: UserInfo) {
        const em = this.repo.getEntityManager();

        const expensesResult = await em.getConnection().execute(
            `SELECT COALESCE(SUM(amount), 0) as total
         FROM "transactionsAuditor"
         WHERE factory_buyer_id = ?`,
            [user.organizationId],
        );

        const incomeResult = await em.getConnection().execute(
            `SELECT COALESCE(SUM(amount), 0) as total
         FROM "transactionsAuditor"
         WHERE factory_seller_id = ?`,
            [user.organizationId],
        );

        return {
            expensesTotal: Number(expensesResult[0]['total']),
            incomeTotal: Number(incomeResult[0]['total']),
        };
    }

    async findByUserAndAssetId(userId: string, assetId: string): Promise<TransactionsAuditor | null> {
        return await this.repo.findOne({ factoryBuyerId: userId, assetId });
    }

    /**
     * Headline market-insight metrics across all recorded transactions:
     *  - `totalAssets`        distinct assets that have been transacted
     *  - `totalSales`         total number of transactions
     *  - `totalMarketCap`     total transacted value (sum of amount)
     *  - `averageSalesPerDay` transactions divided by the number of days that had at least one sale
     *  - `salesVolume`        breakdown of assets by whether their sales volume rose, fell, or stayed flat
     */
    async getMarketInsights(): Promise<MarketInsightsDto> {
        const totals = await this.repo
            .createQueryBuilder('t')
            .select([
                raw('count(distinct t.asset_id) as "totalAssets"'),
                raw('count(*) as "totalSales"'),
                raw('coalesce(sum(t.amount), 0) as "totalMarketCap"'),
                raw(
                    `count(*)::float / nullif(count(distinct date_trunc('day', t.created_at)), 0) as "averageSalesPerDay"`,
                ),
            ])
            .execute<{
                totalAssets: string | number;
                totalSales: string | number;
                totalMarketCap: string | number;
                averageSalesPerDay: string | number | null;
            }>('get');

        return {
            totalAssets: Number(totals.totalAssets),
            totalSales: Number(totals.totalSales),
            totalMarketCap: Number(totals.totalMarketCap),
            averageSalesPerDay: Number(totals.averageSalesPerDay ?? 0),
            salesVolume: await this.getSalesVolume(),
            volumeChanges: await this.getVolumeChange(),
        };
    }

    /**
     * Platform-wide per-day timeline: for each day, the number of sales (transaction count) and the
     * total transacted value (sum of amount). Points are ordered chronologically to feed a line chart.
     */
    async getSalesTimeline(): Promise<TimelinePointDto[]> {
        const day = `date_trunc('day', t.created_at)`;
        const rows = await this.repo
            .createQueryBuilder('t')
            .select([
                raw(`to_char(${day}, 'YYYY-MM-DD') as "day"`),
                raw('count(*) as "sales"'),
                raw('coalesce(sum(t.amount), 0) as "amount"'),
            ])
            .groupBy(raw(day))
            .execute<{ day: string; sales: string | number; amount: string | number }[]>('all');

        return rows
            .map((row) => ({ day: row.day, sales: Number(row.sales), amount: Number(row.amount) }))
            .sort((a, b) => a.day.localeCompare(b.day));
    }

    /** The most recent transactions (newest first), capped at `limit`. */
    async getLatestTransactions(limit: number): Promise<TransactionsAuditor[]> {
        return this.repo.find({}, { orderBy: { createdAt: QueryOrder.DESC }, limit });
    }

    /**
     * Classifies every asset by how its daily sales volume changed between its first and last active
     * day: compare the sales count on the asset's earliest active day to its latest active day and
     * bucket by `(last - first) / first` using a ±5% dead zone (within ±5% counts as stable). Returns
     * the number of assets that increased, decreased, or stayed stable.
     */
    private async getSalesVolume(): Promise<SalesVolumeDto> {
        const aggregates = await this.computeAssetAggregates();

        const tolerance = 0.05;
        const salesVolume: SalesVolumeDto = { increasing: 0, decreasing: 0, stable: 0 };
        for (const { series } of aggregates) {
            // series is day-sorted, so first/last entries are the earliest/latest active day.
            const firstSales = series[0].sales;
            const lastSales = series[series.length - 1].sales;
            const pctChange = (lastSales - firstSales) / firstSales;
            if (pctChange > tolerance) {
                salesVolume.increasing++;
            } else if (pctChange < -tolerance) {
                salesVolume.decreasing++;
            } else {
                salesVolume.stable++;
            }
        }

        return salesVolume;
    }

    /**
     * Platform-wide change in sales volume for every granularity (day, week, month). For each one,
     * transactions are bucketed per period and the most recent period is compared to the immediately
     * preceding one, yielding the absolute change and the relative change (`volumeChangePct`) — the
     * latter is null when the preceding period had no sales.
     */
    async getVolumeChange(): Promise<VolumeChangeByGranularityDto[]> {
        const granularities = Object.values(VolumeGranularity);
        return Promise.all(
            granularities.map(async (value) => ({ granularity: value, ...(await this.computeVolumeChange(value)) })),
        );
    }

    private async computeVolumeChange(granularity: VolumeGranularity): Promise<VolumeChangeDto> {
        const period = `date_trunc('${granularity}', t.created_at)`;
        const rows = await this.repo
            .createQueryBuilder('t')
            .select([raw(`to_char(${period}, 'YYYY-MM-DD') as "period"`), raw('count(*) as "sales"')])
            .groupBy(raw(period))
            .execute<{ period: string; sales: string | number }[]>('all');

        // ISO date keys sort chronologically, so the greatest key is the most recent period.
        const volumes = new Map<string, number>();
        let latest: string | undefined;
        for (const row of rows) {
            volumes.set(row.period, Number(row.sales));
            if (latest === undefined || row.period > latest) {
                latest = row.period;
            }
        }

        // Most recent period vs the immediately preceding calendar period; a preceding
        // period with no sales is absent from the map and therefore counts as 0.
        let currentVolume = 0;
        let previousVolume = 0;
        if (latest !== undefined) {
            currentVolume = volumes.get(latest) ?? 0;
            previousVolume = volumes.get(this.previousPeriod(latest, granularity)) ?? 0;
        }
        const volumeChange = currentVolume - previousVolume;
        const volumeChangePct = previousVolume === 0 ? null : volumeChange / previousVolume;

        return { volumeChange, volumeChangePct };
    }

    /** Returns the ISO date (YYYY-MM-DD) of the period immediately preceding the given one. */
    private previousPeriod(period: string, granularity: VolumeGranularity): string {
        const date = new Date(`${period}T00:00:00Z`);
        if (granularity === VolumeGranularity.Day) {
            date.setUTCDate(date.getUTCDate() - 1);
        } else if (granularity === VolumeGranularity.Week) {
            date.setUTCDate(date.getUTCDate() - 7);
        } else {
            date.setUTCMonth(date.getUTCMonth() - 1);
        }
        return date.toISOString().slice(0, 10);
    }

    /**
     * Top and worst performing assets ranked by their value change — the relative change in
     * transacted amount between each asset's first and last active day. Returns the `limit` best and
     * `limit` worst assets. Assets whose first active day had 0 amount have an undefined change and
     * are excluded from the ranking.
     */
    async getPerformingAssets(limit: number): Promise<PerformingAssetsDto> {
        const aggregates = await this.computeAssetAggregates();
        const ranked = aggregates.filter(
            (asset): asset is AssetAggregate & { changePct: number } => asset.changePct !== null,
        );
        const top = [...ranked]
            .sort((a, b) => b.changePct - a.changePct)
            .slice(0, limit)
            .map((asset) => this.toPerformance(asset));
        const worst = [...ranked]
            .sort((a, b) => a.changePct - b.changePct)
            .slice(0, limit)
            .map((asset) => this.toPerformance(asset));

        return { top, worst };
    }

    /**
     * Per-asset timeline: for each asset, its total transacted value, its value change between the
     * first and last active day, and the per-day sales/value series. Assets are ordered by total
     * value; `limit` optionally caps how many are returned (all assets when omitted).
     */
    async getAssetsTimeline(limit?: number): Promise<AssetTimelineDto[]> {
        // When a limit is given, resolve the top-N assets by value in the DB so we only pull the
        // daily series for those assets instead of every asset.
        const assetIds = limit != null ? await this.topAssetIdsByValue(limit) : undefined;
        const aggregates = await this.computeAssetAggregates(assetIds);
        // Value desc, asset id asc as a stable tiebreaker so the selected/returned order matches
        // topAssetIdsByValue when several assets share the same market cap at the limit boundary.
        const ordered = aggregates.sort((a, b) => b.marketCap - a.marketCap || a.assetId.localeCompare(b.assetId));

        return ordered.map((asset) => ({
            assetId: asset.assetId,
            assetName: asset.assetName,
            amount: asset.marketCap,
            changePct: asset.changePct,
            series: asset.series,
        }));
    }

    /** Returns the ids of the `limit` highest-value assets (by total transacted amount). */
    private async topAssetIdsByValue(limit: number): Promise<string[]> {
        const rows = await this.repo
            .createQueryBuilder('t')
            .select([raw('t.asset_id as "assetId"')])
            .groupBy(raw('t.asset_id'))
            .orderBy({ [raw('coalesce(sum(t.amount), 0)')]: 'desc', [raw('t.asset_id')]: 'asc' })
            .limit(limit)
            .execute<{ assetId: string }[]>('all');

        return rows.map((row) => row.assetId);
    }

    /** Maps a computed asset aggregate to the performance row exposed by the API. */
    private toPerformance(asset: AssetAggregate): AssetPerformanceDto {
        return {
            assetId: asset.assetId,
            assetName: asset.assetName,
            price: asset.price,
            totalSales: asset.totalSales,
            marketCap: asset.marketCap,
            changePct: asset.changePct,
        };
    }

    /**
     * Per-asset aggregates derived from a single (asset, day) grouping query: all-time totals
     * (sales, market cap, average price), first/last active day amounts (→ value change), and the
     * per-day series for timelines. When `assetIds` is provided, only those assets are aggregated.
     */
    private async computeAssetAggregates(assetIds?: string[]): Promise<AssetAggregate[]> {
        const day = `date_trunc('day', t.created_at)`;
        const qb = this.repo
            .createQueryBuilder('t')
            .select([
                raw('t.asset_id as "assetId"'),
                raw('max(t.asset_name) as "assetName"'),
                raw(`to_char(${day}, 'YYYY-MM-DD') as "day"`),
                raw('count(*) as "sales"'),
                raw('coalesce(sum(t.amount), 0) as "amount"'),
            ]);
        if (assetIds) {
            qb.where({ assetId: { $in: assetIds } });
        }
        const rows = await qb
            .groupBy([raw('t.asset_id'), raw(day)])
            .orderBy({ [raw(day)]: 'asc' })
            .execute<
                { assetId: string; assetName: string; day: string; sales: string | number; amount: string | number }[]
            >('all');

        // Rows arrive day-ascending, so each asset's series is built in chronological order.
        const byAsset = new Map<string, AssetAggregate>();
        for (const row of rows) {
            const sales = Number(row.sales);
            const amount = Number(row.amount);
            let asset = byAsset.get(row.assetId);
            if (!asset) {
                asset = {
                    assetId: row.assetId,
                    assetName: row.assetName,
                    totalSales: 0,
                    marketCap: 0,
                    price: 0,
                    changePct: null,
                    series: [],
                };
                byAsset.set(row.assetId, asset);
            }
            asset.totalSales += sales;
            asset.marketCap += amount;
            asset.series.push({ day: row.day, sales, amount });
        }

        for (const asset of byAsset.values()) {
            // totalSales is always >= 1 (an asset only exists here if it has at least one sale).
            asset.price = asset.marketCap / asset.totalSales;
            const firstDayAmount = asset.series[0].amount;
            const lastDayAmount = asset.series[asset.series.length - 1].amount;
            asset.changePct = firstDayAmount === 0 ? null : (lastDayAmount - firstDayAmount) / firstDayAmount;
        }

        return [...byAsset.values()];
    }
}
