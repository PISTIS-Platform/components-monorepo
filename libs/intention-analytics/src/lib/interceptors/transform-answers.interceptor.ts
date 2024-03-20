import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IAnswer, QuestionResponse } from '../interfaces';

@Injectable()
export class TransformAnswersInterceptor<T> implements NestInterceptor<T, any[]> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any[]> {
        return next.handle().pipe(
            map((data) => {
                const finalResults: QuestionResponse[] = [];

                //put all the question responses into one array
                const allResponses: Record<string, any>[] = [].concat(
                    ...data.map((answerRow: IAnswer) => answerRow.responses),
                );

                // based on the above, group questions into the final results array
                for (let i = 0; i < allResponses.length; i++) {
                    const questionResponse = allResponses[i];

                    //check if result already exists in final results
                    const resultItem = finalResults.find(
                        (result: QuestionResponse) => result.questionId === questionResponse['questionId'],
                    );

                    //create array with submitted answers by user (text or option)
                    const submittedAnswers: string[] =
                        'text' in questionResponse && questionResponse['text']
                            ? [questionResponse['text']]
                            : questionResponse['options'] ?? [];

                    //skip the iteration if neither text or options are found
                    if (!submittedAnswers.length) {
                        continue;
                    }

                    //add item into the final results array
                    //if the result item does not exist, create it
                    if (resultItem) {
                        resultItem.responses = [...resultItem.responses, ...submittedAnswers];
                    } else {
                        finalResults.push({
                            questionId: questionResponse['questionId'],
                            questionTitle: questionResponse['questionTitle'],
                            responses: submittedAnswers,
                        });
                    }
                }

                return finalResults;
            }),
        );
    }
}
