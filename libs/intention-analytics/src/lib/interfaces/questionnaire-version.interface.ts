import { Loaded } from '@mikro-orm/core';

import { Questionnaire } from '../entities';

export type LoadedQuestionnaire = Loaded<
    Questionnaire,
    never,
    'id' | 'version' | 'isForVerifiedBuyers' | 'title' | 'publicationDate',
    never
>;
