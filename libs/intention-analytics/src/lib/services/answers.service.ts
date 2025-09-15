import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { wrap } from '@mikro-orm/core';
import { UserInfo } from '@pistis/shared';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { Answer, Questionnaire, Question } from '../entities';

@Injectable()
export class AnswersService {
    private readonly logger = new Logger(AnswersService.name);
    constructor(
        @InjectRepository(Answer) private readonly answersRepo: EntityRepository<Answer>,
        @InjectRepository(Questionnaire) private readonly questionnaireRepo: EntityRepository<Questionnaire>,
        @InjectRepository(Question) private readonly questionRepo: EntityRepository<Question>,
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

    async getAnswers(assetId: string, user: UserInfo) {
        const questionnaire = await this.questionnaireRepo.findOneOrFail({
                creatorId: user.id,
            });

        const answers = await this.answersRepo.find(
                {
                    assetId,
                },
                {
                    fields: ['responses', 'createdAt'],
                },
            );
        
        //If user is the creator or if the user is an admin (no organizationId), allow
        if (user.id === questionnaire?.creatorId || !user.organizationId) {
            return answers;
        } else {
            throw new UnauthorizedException(`You are not authorized to view these answers`);
        }
    }
}
