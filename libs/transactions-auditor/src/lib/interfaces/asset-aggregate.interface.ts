import { TimelinePointDto } from '../dto';

export interface AssetAggregate {
    assetId: string;
    assetName: string;
    totalSales: number;
    marketCap: number;
    price: number;
    changePct: number | null;
    series: TimelinePointDto[];
}
