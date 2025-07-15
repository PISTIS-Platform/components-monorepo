import { Loaded } from '@mikro-orm/core';

import { Answer, Question } from '../entities';
import { QuestionType } from '../constants';

export interface QuestionResponse {
    questionId: string;
    questionTitle: string;
    responses: string[];
    questionType: QuestionType | null;
}

export type IAnswer = Loaded<Answer, never, 'responses', never>;
