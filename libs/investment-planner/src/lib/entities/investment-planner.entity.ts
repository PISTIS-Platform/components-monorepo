import { Collection, Entity, OneToMany, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

import { UserInvestment } from './user-investment.entity';

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
    title!: string;

    @Property()
    description!: string;

    @Property({ type: 'json' })
    terms!: Record<string, any>[];

    @Property()
    sellerId!: string;

    @Property({ type: 'timestamptz' })
    dueDate!: Date;

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

    @OneToMany(() => UserInvestment, (item) => item.investmentPlan)
    userInvestment = new Collection<UserInvestment>(this);

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
