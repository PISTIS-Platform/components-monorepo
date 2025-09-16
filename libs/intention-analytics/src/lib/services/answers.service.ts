import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { getHeaders, UserInfo } from '@pistis/shared';
import { catchError, firstValueFrom, map, switchMap, throwError } from 'rxjs';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { Answer, Question, Questionnaire } from '../entities';
import { INTENSION_ANALYTICS_MODULE_OPTIONS } from '../intension-analytics.module-definition';
import { IntensionAnalyticsModuleOptions } from '../intension-analytics-module-options.interface';

@Injectable()
export class AnswersService {
    private readonly logger = new Logger(AnswersService.name);
    constructor(
        @InjectRepository(Answer) private readonly answersRepo: EntityRepository<Answer>,
        @InjectRepository(Questionnaire) private readonly questionnaireRepo: EntityRepository<Questionnaire>,
        @InjectRepository(Question) private readonly questionRepo: EntityRepository<Question>,
        private readonly httpService: HttpService,
        @Inject(INTENSION_ANALYTICS_MODULE_OPTIONS) private options: IntensionAnalyticsModuleOptions,
    ) {}

    async findActiveVersion(isForVerifiedBuyers: boolean) {
        return this.questionnaireRepo.findOneOrFail(
            {
                isActive: true,
                isForVerifiedBuyers,
            },
            {
                populate: [
                    'questions.id',
                    'questions.title',
                    'questions.type',
                    'questions.options',
                    'questions.isRequired',
                ],
                fields: ['title', 'description', 'creatorId'],
            },
        );
    }

    private async verifyTransaction(userId: string, assetId: string) {
        const tokenData = {
            grant_type: 'client_credentials',
            client_id: this.options.clientId,
            client_secret: this.options.secret,
        };
        return await firstValueFrom(
            this.httpService
                .post(`${this.options.authServerUrl}/realms/PISTIS/protocol/openid-connect/token`, tokenData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    data: tokenData,
                })
                .pipe(
                    map(({ data }) => data.access_token),
                    switchMap((access_token) =>
                        this.httpService.get(
                            `${this.options.transactionAuditorUrl}/srv/transactions-auditor/api/transactions-auditor/transaction/${userId}/${assetId}`,
                            {
                                headers: getHeaders(access_token),
                            },
                        ),
                    ),
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error('Error occurred during transaction retrieval: ', error);
                        return throwError(() => new BadRequestException('Error occurred during transaction retrieval'));
                    }),
                ),
        );
    }

    async getUserQuestionnaire1(assetId: string, userId: string) {
        let forVerifiedBuyers: boolean;
        const transaction = await this.verifyTransaction(userId, assetId);
        if (transaction) {
            forVerifiedBuyers = true;
        } else {
            forVerifiedBuyers = false;
        }
        const questionnaire = await this.findActiveVersion(forVerifiedBuyers);

        const answers = await this.answersRepo.findOne({
            assetId: assetId,
            userId: userId,
            questionnaire: { id: questionnaire.id, version: questionnaire.version },
        });
        if (answers) {
            throw new BadRequestException('You have already submitted answers for this asset');
        }
        return questionnaire;
    }

    async getUserQuestionnaire(assetId: string, userId: string, forVerifiedBuyers: boolean) {
        const questionnaire = await this.findActiveVersion(forVerifiedBuyers);

        const answers = await this.answersRepo.findOne({
            assetId: assetId,
            userId: userId,
            questionnaire: { id: questionnaire.id, version: questionnaire.version },
        });
        if (answers) {
            throw new BadRequestException('You have already submitted answers for this asset');
        }
        return questionnaire;
    }

    async submitAnswers(id: string, version: number, data: CreateAnswerDto, userId: string) {
        const questionnaire = await this.questionnaireRepo.findOneOrFail({
            id,
            version,
            isActive: true,
        });

        const answer = this.answersRepo.create({
            userId,
            assetId: data.assetId,
            responses: data.responses,
            questionnaire: questionnaire,
        });

        await this.answersRepo.getEntityManager().persistAndFlush(answer);
        return answer;
    }

    async getAnswers(assetId: string, user: UserInfo, forVerifiedBuyers: boolean) {
        const questionnaire = await this.questionnaireRepo.findOneOrFail({
            isActive: true,
            creatorId: user.id,
            isForVerifiedBuyers: forVerifiedBuyers,
        });

        const answers = await this.answersRepo.findOne(
            {
                assetId: assetId,
                questionnaire: { id: questionnaire.id },
            },
            { fields: ['responses', 'createdAt'] },
        );

        //If user is the creator or if the user is an admin (no organizationId), allow
        if (user.id === questionnaire?.creatorId || !user.organizationId) {
            return answers;
        } else {
            throw new UnauthorizedException(`You are not authorized to view these answers`);
        }
    }
}
