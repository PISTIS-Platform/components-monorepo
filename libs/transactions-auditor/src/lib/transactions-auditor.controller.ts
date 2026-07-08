import { ApiPaginate, Paginate, PaginateQuery } from '@emulienfou/nestjs-mikro-orm-paginate';
import { Body, Controller, DefaultValuePipe, Get, Param, ParseEnumPipe, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLE, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';

import {
    AssetTimelineDto,
    MarketInsightsDto,
    PerformingAssetsDto,
    TimelinePointDto,
    TransactionAuditorDTO,
    VolumeChangeByGranularityDto,
    VolumeGranularity,
} from './dto';
import { TransactionsAuditorService } from './transactions-auditor.service';

@Controller('transactions-auditor')
@ApiTags('transactions-auditor')
@ApiBearerAuth()
export class TransactionsAuditorController {
    constructor(private readonly service: TransactionsAuditorService) {}

    @Post()
    @ApiOperation({ summary: 'Create transaction auditor log entry' })
    async create(@Body() data: TransactionAuditorDTO) {
        return this.service.create(data);
    }

    @Get()
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOperation({ summary: 'Retrieve transactions' })
    @ApiPaginate()
    async retrieveAll(@Paginate() query: PaginateQuery) {
        return this.service.retrieveAll(query);
    }

    @Get('/transaction/factory')
    @ApiOperation({ summary: 'Retrieve transactions by factoryId' })
    @ApiPaginate()
    async retrieveByFactory(
        @Paginate() query: PaginateQuery,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ) {
        return this.service.retrieveByFactory(query, user);
    }

    @Get('/transaction/summary')
    @ApiOperation({ summary: 'Retrieve expenses and income by factory from 30 days ago' })
    async retrieveSums(@AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo) {
        return this.service.getSumsByFactory(user);
    }

    @Get('/market-insights')
    @ApiOperation({
        summary: 'Retrieve headline market insights',
        description:
            'Total assets, total sales, total market cap, average sales per day, and the sales-volume trend breakdown across all transactions.',
    })
    @ApiOkResponse({ type: MarketInsightsDto })
    async getMarketInsights() {
        return this.service.getMarketInsights();
    }

    @Get('/market-insights/volume-change')
    @ApiOperation({
        summary: 'Retrieve platform sales-volume change',
        description:
            'Change in number of sales for the most recent period versus the previous one. With a granularity, returns that single period; without one, returns the change for all granularities (day, week, month).',
    })
    @ApiQuery({ name: 'granularity', enum: VolumeGranularity, required: false })
    @ApiOkResponse({ type: VolumeChangeByGranularityDto, isArray: true })
    async getVolumeChange(
        @Query('granularity', new ParseEnumPipe(VolumeGranularity, { optional: true })) granularity?: VolumeGranularity,
    ) {
        return this.service.getVolumeChange(granularity);
    }

    @Get('/market-insights/timeline')
    @ApiOperation({
        summary: 'Retrieve the platform sales timeline',
        description: 'Per-day number of sales and total transacted value across all assets, ordered chronologically.',
    })
    @ApiOkResponse({ type: TimelinePointDto, isArray: true })
    async getSalesTimeline() {
        return this.service.getSalesTimeline();
    }

    @Get('/market-insights/performing-assets')
    @ApiOperation({
        summary: 'Retrieve top and worst performing assets',
        description:
            'Assets ranked by value change between their first and last active day. Returns the best and worst `limit` assets (defaults to 10).',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiOkResponse({ type: PerformingAssetsDto })
    async getPerformingAssets(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
        return this.service.getPerformingAssets(limit);
    }

    @Get('/market-insights/latest-transactions')
    @ApiOperation({
        summary: 'Retrieve the most recent transactions',
        description: 'Newest transactions first, capped at `limit` (defaults to 50).',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getLatestTransactions(@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number) {
        return this.service.getLatestTransactions(limit);
    }

    @Get('/market-insights/assets/timeline')
    @ApiOperation({
        summary: 'Retrieve per-asset sales timelines',
        description:
            'For each asset: total value, value change, and the per-day sales/value series. Ordered by value; `limit` optionally caps how many assets are returned (all when omitted).',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiOkResponse({ type: AssetTimelineDto, isArray: true })
    async getAssetsTimeline(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
        return this.service.getAssetsTimeline(limit);
    }

    @Get('/transaction/:userId/:assetId')
    @ApiOperation({ summary: 'Retrieve transaction by asset and user Id' })
    @ApiPaginate()
    async findByUserAndAssetId(@Param('userId') userId: string, @Param('assetId') assetId: string) {
        return this.service.findByUserAndAssetId(userId, assetId);
    }
}
