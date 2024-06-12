import { lastValueFrom, of } from 'rxjs';

import { IAnswer } from '../interfaces';
import { TransformAnswersInterceptor } from './transform-answers.interceptor';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('TransformAnswersInterceptor', () => {
    let interceptor: TransformAnswersInterceptor<IAnswer[]>;
    let next: any;

    const foundAnswers = [
        {
            responses: [
                {
                    text: 'test answer 1a',
                    questionId: '1be3477a-a055-4b31-bf5d-3d647502b921',
                    questionTitle: 'Question 1 title',
                },
                {
                    text: 'test answer 1b',
                    questionId: '1be3477a-a055-4b31-bf5d-3d647502b921',
                    questionTitle: 'Question 1 title',
                },                
                {
                    text: 'test answer 2',
                    questionId: '71ee850a-2a60-4b09-9e61-c62d78995d8c',
                    questionTitle: 'Question 2 title',
                },
                {
                    options: ['Choice 1', 'Choice 2'],
                    questionId: 'e1b71831-3088-48e1-852f-b9fd5d5c61cb',
                    questionTitle: 'Question 3 title',
                },
            ],
            id: '58e395f8-7d98-4dea-aeac-010b1556140d',
        },
    ];

    beforeEach(async () => {
        next = {
            handle: () => of(foundAnswers),
        };

        interceptor = new TransformAnswersInterceptor();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should successfully return transformed answers', () => {
        expect(lastValueFrom(interceptor.intercept({} as any, next))).resolves.toEqual([
            {
                questionId: '1be3477a-a055-4b31-bf5d-3d647502b921',
                questionTitle: 'Question 1 title',
                responses: ['test answer 1a', 'test answer 1b'],
            },
            {
                questionId: '71ee850a-2a60-4b09-9e61-c62d78995d8c',
                questionTitle: 'Question 2 title',
                responses: ['test answer 2'],
            },
            {
                questionId: 'e1b71831-3088-48e1-852f-b9fd5d5c61cb',
                questionTitle: 'Question 3 title',
                responses: ['Choice 1', 'Choice 2'],
            },
        ]);
    });
});
