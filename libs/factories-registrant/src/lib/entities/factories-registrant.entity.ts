import { Entity, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

@Entity({ tableName: 'factories' })
export class FactoriesRegistrant {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'isAccepted' | 'isActive';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    organizationName!: string;

    @Property()
    organizationId!: string;

    @Property()
    ip!: string;

    @Property()
    country!: string;

    @Property()
    status!: string;

    @Property()
    isAccepted = false;

    @Property()
    isActive = false;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
