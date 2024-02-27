import { Entity, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

@Entity({ tableName: 'notifications' })
export class Notification {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'isHidden' | 'readAt';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    userId!: string;

    @Property()
    organizationId!: string;

    @Property()
    type!: string;

    @Property()
    message!: string;

    @Property({ nullable: true })
    readAt: Date | null = null;

    @Property()
    isHidden = false;

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
