import { Entity, Index, ManyToOne, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

import { InvestmentPlanner } from './investment-planner.entity';

@Entity({ tableName: 'userInvestment' })
export class UserInvestment {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    @Unique()
    cloudAssetId!: string;

    @Property()
    userId!: string;

    @Property()
    shares!: number;

    @ManyToOne(() => InvestmentPlanner)
    @Index()
    investmentPlan!: InvestmentPlanner;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
