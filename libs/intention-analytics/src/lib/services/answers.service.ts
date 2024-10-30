import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { Answer, Questionnaire } from '../entities';

@Injectable()
export class AnswersService {
    private readonly logger = new Logger(AnswersService.name);
    constructor(
        @InjectRepository(Answer) private readonly answersRepo: EntityRepository<Answer>,
        @InjectRepository(Questionnaire) private readonly questionnaireRepo: EntityRepository<Questionnaire>,
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
                fields: ['title', 'description'],
            },
        );
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
