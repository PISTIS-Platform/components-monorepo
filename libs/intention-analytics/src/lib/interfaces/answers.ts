import { Loaded } from '@mikro-orm/core';

import { Answer, Question } from '../entities';
import { QuestionType } from '../constants';

export interface QuestionResponse {
    questionId: string;
    questionTitle: string;
    responses: { response: string[]; date: string }[];
    questionType?: QuestionType | null;
    options?: Record<string,any>;
}

export type IAnswer = Loaded<Answer, never, 'responses' | 'createdAt', never>;
