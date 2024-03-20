import { Loaded } from '@mikro-orm/core';

import { Answer } from '../entities';

export interface QuestionResponse {
    questionId: string;
    questionTitle: string;
    responses: string[];
}

export type IAnswer = Loaded<Answer, never, 'responses', never>;
