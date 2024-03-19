import { Entity, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'assetRetrievalInfo' })
export class AssetRetrievalInfo {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

    @PrimaryKey()
    id: string | undefined;

    @Property()
    @Unique()
    cloudAssetId!: string; //Global(Marketplace) assetId

    //TODO: Maybe add provider id

    @Property({ nullable: true })
    version!: string;

    @Property({ default: 0 })
    offset = 0;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
