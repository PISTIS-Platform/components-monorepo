import { Entity, ManyToOne, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

import { Questionnaire } from './questionnaire.entity';

@Entity({ tableName: 'questions' })
export class Question {
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'description' | 'options';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @Property()
    type!: string;

    @Property()
    title!: string;

    @Property({ nullable: true })
    description?: string;

    @Property()
    isRequired = false;

    @Property({ type: 'json', nullable: true })
    options?: Record<string, any>[];

    // Relations

    @ManyToOne(() => Questionnaire)
    questionnaire!: Questionnaire;

    // Timestamps

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
