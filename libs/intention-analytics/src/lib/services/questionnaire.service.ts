import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';

import { CreateQuestionnaireDto } from '../dto/create-questionnaire.dto';
import { QuestionDto } from '../dto/question.dto';
import { Question, Questionnaire } from '../entities';

@Injectable()
export class QuestionnaireService {
    constructor(
        @InjectRepository(Questionnaire) private readonly questionnaireRepo: EntityRepository<Questionnaire>,
        @InjectRepository(Question) private readonly questionRepo: EntityRepository<Question>,
    ) {}

    async getVersions() {
        return this.questionnaireRepo.findAll({
            fields: ['id', 'version', 'isForVerifiedBuyers', 'isActive', 'title', 'publicationDate'],
        });
    }

    async create(dto: CreateQuestionnaireDto) {
        //find the latest version for this type of questionnaire
        //(based on whether it's for verified buyers or not)
        const latestVersion = await this.questionnaireRepo.findOne(
            {
                isForVerifiedBuyers: dto.isForVerifiedBuyers,
            },
            { orderBy: { version: 'desc' } },
        );

        //Create the questionnaire
        const questionnaire = this.questionnaireRepo.create({
            title: dto.title,
            description: dto?.description || null,
            isForVerifiedBuyers: dto.isForVerifiedBuyers,
            isActive: dto.isActive,
            creatorId: dto.creatorId,
            version: (latestVersion?.version || 0) + 1,
        });

        //Create the questions
        questionnaire.questions.add(
            dto.questions.map((questionItem: QuestionDto) =>
                this.questionRepo.create({
                    title: questionItem.title,
                    description: questionItem?.description || null,
                    type: questionItem.type,
                    isRequired: questionItem.isRequired,
                    options: questionItem.options,
                    questionnaire,
                }),
            ),
        );

        //deactivate the rest of questionnaires if the user has selected to activate this one
        if (dto.isActive) {
            await this.questionnaireRepo.nativeUpdate(
                {
                    isForVerifiedBuyers: dto.isForVerifiedBuyers,
                },
                { isActive: false },
            );
        }

        // persist entities into the database
        await this.questionnaireRepo.getEntityManager().flush();

        return questionnaire;
    }

    async activate(id: string, version: number) {
        const questionnaire = await this.questionnaireRepo.findOneOrFail(
            { id, version },
            { fields: ['id', 'version', 'isActive', 'isForVerifiedBuyers', 'publicationDate'] },
        );

        // deactivate all other versions
        await this.questionnaireRepo.nativeUpdate(
            {
                isForVerifiedBuyers: questionnaire.isForVerifiedBuyers,
            },
            { isActive: false },
        );

        // activate the version
        questionnaire.publicationDate = new Date();
        questionnaire.isActive = true;

        await this.questionnaireRepo.getEntityManager().flush();

        return questionnaire;
    }

    async deactivate(id: string, version: number) {
        const questionnaire = await this.questionnaireRepo.findOneOrFail(
            { id, version },
            { fields: ['id', 'version', 'isActive'] },
        );

        //deactivate version
        questionnaire.isActive = false;

        await this.questionnaireRepo.getEntityManager().flush();

        return questionnaire;
    }

    async delete(id: string, version: number) {
        // find potential connected answers
        const questionnaire = await this.questionnaireRepo.findOneOrFail(
            { id, version },
            { populate: ['questions', 'answers'] },
        );

        // throw exception if version has connected answers with it
        if (questionnaire.answers.length) {
            throw new BadRequestException(
                'You cannot delete the questionnaire, as there are already responses collected',
            );
        }

        // delete questionnaire version
        return await this.questionnaireRepo.getEntityManager().removeAndFlush(questionnaire);
    }

    async find(id: string, version: number) {
        return this.questionnaireRepo.findOneOrFail(
            {
                id,
                version,
            },
            {
                populate: [
                    'questions.id',
                    'questions.title',
                    'questions.isRequired',
                    'questions.type',
                    'questions.options',
                ],
                fields: ['isForVerifiedBuyers', 'title', 'description', 'isActive'],
            },
        );
    }
}
