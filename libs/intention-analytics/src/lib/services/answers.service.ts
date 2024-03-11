import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, Loaded } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { Answer, Questionnaire } from '../entities';

@Injectable()
export class AnswersService {
    constructor(
        @InjectRepository(Answer) private readonly answersRepo: EntityRepository<Answer>,
        @InjectRepository(Questionnaire) private readonly questionnaireRepo: EntityRepository<Questionnaire>,
    ) {}

    async findActiveVersion(
        isForVerifiedBuyers: boolean,
    ): Promise<
        Loaded<
            Questionnaire,
            'questions.id' | 'questions.title' | 'questions.type' | 'questions.options' | 'questions.isRequired',
            'title' | 'description',
            never
        >
    > {
        return await this.questionnaireRepo.findOneOrFail(
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

    async submitAnswers(id: string, version: number, dto: CreateAnswerDto): Promise<void> {
        const questionnaire = await this.questionnaireRepo.findOneOrFail({
            id,
            version,
            isActive: true,
        });

        const answer = this.answersRepo.create({
            userId: dto.userId,
            assetId: dto.assetId,
            responses: dto.responses,
            questionnaire: questionnaire,
        });

        return await this.answersRepo.getEntityManager().persistAndFlush(answer);
    }
}
