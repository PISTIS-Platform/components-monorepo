import { BlobType, Entity, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

@Entity({ tableName: 'modelRepository' })
export class ModelRepository {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'filepath';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    title!: string;

    @Property()
    description!: string;

    @Property()
    type!: string;

    @Property()
    version!: string;

    @Property({ type: 'float' })
    size!: number;

    @Property({ type: BlobType })
    data!: Buffer;

    //For now we use this filed to store filename but in case that we change something we can store the filepath
    @Property({ nullable: true })
    filepath: string | null = null;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
