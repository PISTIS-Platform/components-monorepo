import { Entity, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

@Entity({ tableName: 'registeredServices' })
export class RegisteredService {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    serviceName!: string;

    @Property()
    @Unique()
    serviceUrl!: string;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
