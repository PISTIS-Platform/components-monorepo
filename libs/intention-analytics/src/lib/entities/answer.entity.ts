import { Entity, Index, ManyToOne, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

import { Questionnaire } from './questionnaire.entity';

@Entity({ tableName: 'answers' })
@Unique({ properties: ['userId', 'assetId', 'questionnaire'] })
export class Answer {
    [OptionalProps]?: 'id' | 'createdAt';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property({ type: 'json' })
    responses!: Record<string, any>[];

    @Property()
    @Index()
    userId!: string;

    @Property()
    @Index()
    assetId!: string;

    // Relations

    @ManyToOne(() => Questionnaire)
    @Index()
    questionnaire!: Questionnaire;

    // Timestamps

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();
}
