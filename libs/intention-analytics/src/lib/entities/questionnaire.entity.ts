import { Cascade, Collection, Entity, OneToMany, OptionalProps, PrimaryKey, PrimaryKeyProp, Property } from '@mikro-orm/core';
import { v4 as uuidV4 } from 'uuid';

import { Answer } from './answer.entity';
import { Question } from './question.entity';

@Entity({ tableName: 'questionnaires' })
export class Questionnaire {
    [PrimaryKeyProp]?: ['id', 'version'];
    [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'description' | 'publicationDate';

    @PrimaryKey({ type: 'uuid' })
    id: string = uuidV4();

    @PrimaryKey({ type: 'int8' })
    version!: number;

    @Property()
    creatorId!: string;

    @Property()
    isForVerifiedBuyers!: boolean;

    @Property()
    title!: string;

    @Property({ nullable: true })
    description?: string;

    @Property()
    isActive!: boolean;

    @Property({ type: 'timestamptz', nullable: true })
    publicationDate?: Date;

    // Relations

    @OneToMany(() => Question, (item) => item.questionnaire, { cascade: [Cascade.REMOVE]})
    questions = new Collection<Question>(this);

    @OneToMany(() => Answer, (item) => item.questionnaire)
    answers = new Collection<Answer>(this);

    // Timestamps

    @Property({ type: 'timestamptz' })
    createdAt: Date = new Date();

    @Property({ type: 'timestamptz', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
