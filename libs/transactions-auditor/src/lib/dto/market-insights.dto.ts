import { ApiProperty } from '@nestjs/swagger';

export enum VolumeGranularity {
    Day = 'day',
    Week = 'week',
    Month = 'month',
}

export class SalesVolumeDto {
    @ApiProperty({ description: 'Assets whose sales volume increased (>5%) between their first and last active day' })
    increasing!: number;

    @ApiProperty({ description: 'Assets whose sales volume decreased (>5%) between their first and last active day' })
    decreasing!: number;

    @ApiProperty({ description: 'Assets whose sales volume stayed within ±5% between their first and last active day' })
    stable!: number;
}

export class MarketInsightsDto {
    @ApiProperty()
    totalAssets!: number;

    @ApiProperty()
    totalSales!: number;

    @ApiProperty()
    totalMarketCap!: number;

    @ApiProperty()
    averageSalesPerDay!: number;

    @ApiProperty({ type: SalesVolumeDto })
    salesVolume!: SalesVolumeDto;

    @ApiProperty({ type: () => VolumeChangeByGranularityDto, isArray: true })
    volumeChanges!: VolumeChangeByGranularityDto[];
}

export class AssetPerformanceDto {
    @ApiProperty()
    assetId!: string;

    @ApiProperty()
    assetName!: string;

    @ApiProperty({ description: 'Average amount per sale (marketCap / totalSales)' })
    price!: number;

    @ApiProperty({ description: 'Total number of transactions for the asset' })
    totalSales!: number;

    @ApiProperty({ description: 'Total transacted value for the asset (sum of amount)' })
    marketCap!: number;

    @ApiProperty({
        type: Number,
        nullable: true,
        description:
            'Value change between the asset first and last active day: (lastDayAmount - firstDayAmount) / firstDayAmount',
    })
    changePct!: number | null;
}

export class PerformingAssetsDto {
    @ApiProperty({ type: [AssetPerformanceDto], description: 'Top 10 assets by value change' })
    top!: AssetPerformanceDto[];

    @ApiProperty({ type: [AssetPerformanceDto], description: 'Worst 10 assets by value change' })
    worst!: AssetPerformanceDto[];
}

export class TimelinePointDto {
    @ApiProperty({ description: 'Day bucket (YYYY-MM-DD)' })
    day!: string;

    @ApiProperty({ description: 'Number of sales on that day' })
    sales!: number;

    @ApiProperty({ description: 'Sum of amount on that day' })
    amount!: number;
}

export class AssetTimelineDto {
    @ApiProperty()
    assetId!: string;

    @ApiProperty()
    assetName!: string;

    @ApiProperty({ description: 'Total transacted value for the asset (sum of amount)' })
    amount!: number;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: 'Value change between the asset first and last active day',
    })
    changePct!: number | null;

    @ApiProperty({ type: [TimelinePointDto], description: 'Per-day sales/amount series for the line graph' })
    series!: TimelinePointDto[];
}

export class VolumeChangeDto {
    @ApiProperty({ description: 'Sales in the most recent period minus the immediately preceding period' })
    volumeChange!: number;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: 'Relative volume change vs the previous period; null when the previous period had no sales',
    })
    volumeChangePct!: number | null;
}

export class VolumeChangeByGranularityDto extends VolumeChangeDto {
    @ApiProperty({ enum: VolumeGranularity })
    granularity!: VolumeGranularity;
}
