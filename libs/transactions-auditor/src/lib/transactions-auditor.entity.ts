import { Entity, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

@Entity({ tableName: 'transactionsAuditor' })
export class TransactionsAuditor {
    [OptionalProps]?: 'transactionFee' | 'createdAt' | 'updatedAt';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    transactionId!: string;

    @Property({ type: 'float', nullable: true })
    transactionFee?: number;

    @Property({ type: 'float' })
    amount!: number;

    @Property()
    factoryBuyerId!: string;

    @Property()
    factoryBuyerName!: string;

    @Property()
    factorySellerId!: string;

    @Property()
    factorySellerName!: string;

    @Property()
    assetId!: string;

    @Property()
    assetName!: string;

    @Property({ type: 'text' })
    terms!: string;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
