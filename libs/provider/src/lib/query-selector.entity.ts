import { Entity, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'querySelector' })
export class QuerySelector {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

    @PrimaryKey()
    id: string | undefined;

    @Property()
    @Unique()
    cloudAssetId!: string;

    @Property({ type: 'json' })
    params!: Record<string, any>[];

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
