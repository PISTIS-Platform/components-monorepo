import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '@pistis/blockchain';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { Answer, Questionnaire } from '../entities';
import { INTENSION_ANALYTICS_MODULE_OPTIONS } from '../intension-analytics.module-definition';
import { IntensionAnalyticsModuleOptions } from '../intension-analytics-module-options.interface';

@Injectable()
export class AnswersService {
    private readonly logger = new Logger(AnswersService.name);
    constructor(
        @InjectRepository(Answer) private readonly answersRepo: EntityRepository<Answer>,
        @InjectRepository(Questionnaire) private readonly questionnaireRepo: EntityRepository<Questionnaire>,
        @Inject(INTENSION_ANALYTICS_MODULE_OPTIONS) private options: IntensionAnalyticsModuleOptions,
        private readonly blockchainService: BlockchainService,
        private readonly httpService: HttpService,
    ) { }

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
                fields: ['title', 'description'],
            },
        );
    }

    async getUserQuestionnaire(assetId: string, token: string, userId: string) {

        //TODO: Remove this validation 
        // const assetCheck = await this.blockchainService.isContractValid(assetId, token);

        // if (assetCheck.id) {
        const questionnaire = await this.findActiveVersion(true);
        // } else {
        //     questionnaire = await this.findActiveVersion(false);
        // }

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

    async getAnswers(assetId: string) {
        return this.answersRepo.find(
            {
                assetId,
            },
            {
                fields: ['responses'],
            },
        );
    }
}
