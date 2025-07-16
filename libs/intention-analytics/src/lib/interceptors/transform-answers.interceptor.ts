import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Question } from '../entities';

import { IAnswer, QuestionResponse } from '../interfaces';
import { QuestionType } from '../constants';

@Injectable()
export class TransformAnswersInterceptor<T> implements NestInterceptor<T, any[]> {
    constructor(@InjectRepository(Question) private readonly questionRepo: EntityRepository<Question>) {}
    intercept(context: ExecutionContext, next: CallHandler): Observable<any[]> {
        return next.handle().pipe(
            mergeMap(async (data) => {
                const finalResults: QuestionResponse[] = [];

                //put all the question responses into one array
                //add the date it was given at in order to group by answer or by date
                const allResponses: Record<string, any>[] = [].concat(
                    ...data.map((answerRow: IAnswer) =>
                        answerRow.responses.map((response: any) => ({
                            ...response,
                            date: answerRow.createdAt,
                        })),
                    ),
                );

                // based on the above, group questions into the final results array
                for (let i = 0; i < allResponses.length; i++) {
                    const questionResponse = allResponses[i];

                    //check if result already exists in final results
                    const resultItem = finalResults.find(
                        (result: QuestionResponse) => result.questionId === questionResponse['questionId'],
                    ) as QuestionResponse;

                    //create array with submitted answers by user (text or option)
                    //add date to each answer in order to group by answer or by date
                    const submittedAnswers: { response: string[]; date: string }[] =
                        'text' in questionResponse && questionResponse['text']
                            ? [{ response: questionResponse['text'], date: questionResponse['date'] }]
                            : questionResponse['options'].map((option: string) => ({
                                  response: option,
                                  date: questionResponse['date'],
                              })) ?? [];

                    //skip the iteration if neither text or options are found
                    if (!submittedAnswers.length) {
                        continue;
                    }

                    //add item into the final results array
                    //if the result item does not exist, create it
                    if (resultItem) {
                        resultItem.responses = [...resultItem.responses, ...submittedAnswers];
                    } else {
                        const questionFromDb = await this.questionRepo.findOne({ id: questionResponse['questionId'] });
                        finalResults.push({
                            questionId: questionResponse['questionId'],
                            questionTitle: questionResponse['questionTitle'],
                            responses: submittedAnswers,
                            questionType: questionFromDb ? (questionFromDb.type as QuestionType) : null,
                            options: questionFromDb
                                ? questionFromDb.options?.map((option: Record<string, any>) => option['text'])
                                : [],
                        });
                    }
                }

                return finalResults;
            }),
        );
    }
}
