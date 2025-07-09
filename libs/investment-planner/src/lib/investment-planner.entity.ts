import { Entity, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'investmentPlanner' })
export class InvestmentPlanner {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

    @PrimaryKey()
    id: string | undefined;

    @Property()
    @Unique()
    cloudAssetId!: string;

    @Property()
    dueDate!: string;

    @Property()
    percentageOffer!: number;

    @Property()
    totalShares!: number;

    @Property()
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
