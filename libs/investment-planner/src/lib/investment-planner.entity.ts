import { Entity, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

@Entity({ tableName: 'investmentPlanner' })
export class InvestmentPlanner {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    @Unique()
    cloudAssetId!: string;

    @Property()
    assetId!: string;

    @Property()
    dueDate!: string;

    @Property()
    percentageOffer!: number;

    @Property()
    totalShares!: number;

    @Property({ nullable: true })
    remainingShares!: number;

    @Property()
    maxShares!: number;

    @Property()
    price!: number;

    @Property()
    status!: boolean;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
