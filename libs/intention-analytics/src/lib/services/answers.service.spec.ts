import { NotFoundException } from '@nestjs/common';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { AnswersService } from './answers.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('QuestionnaireService', () => {
    let service: AnswersService;

    let questionnaireRepo: any;
    let answersRepo: any;
    let createAnswersDto: CreateAnswerDto;
    let userId: string;

    beforeEach(async () => {
        questionnaireRepo = {
            findOneOrFail: jest.fn(),
        };

        answersRepo = {
            create: jest.fn(),
            find: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: () => jest.fn(),
            }),
        };
        service = new AnswersService(answersRepo, questionnaireRepo);

        createAnswersDto = {
            assetId: '100',
            responses: [
                {
                    questionId: 'db469342-d725-4d20-b06d-0ffa6feaeb76',
                    questionTitle: 'Question Title',
                    text: 'Testing',
                },
                {
                    questionId: 'db469342-d725-4d20-b06d-0ffa6feaeb89',
                    questionTitle: 'Question Title 2',
                    options: ['Option1', 'Option2'],
                },
            ],
        };

        userId = '123';
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return active questionnaire version for verified buyers', async () => {
        const questionnaire = {
            id: '1',
            version: 3,
            isActive: true,
            isForVerifiedBuyers: true,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(questionnaire);

        expect(await service.findActiveVersion(true)).toEqual(questionnaire);

        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledWith(
            {
                isActive: true,
                isForVerifiedBuyers: true,
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
    });

    it('should return active questionnaire version for general users', async () => {
        const questionnaire = {
            id: '1',
            version: 3,
            isActive: true,
            isForVerifiedBuyers: false,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(questionnaire);

        expect(await service.findActiveVersion(false)).toEqual(questionnaire);

        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledWith(
            {
                isActive: true,
                isForVerifiedBuyers: false,
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
    });

    it('should throw exception when finding a nonexistent questionnaire', async () => {
        questionnaireRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        try {
            await service.findActiveVersion(true);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
        }
    });

    it('should submit answers for a questionnaire', async () => {
        const questionnaire = {
            id: '1',
            version: 3,
            isActive: true,
            isForVerifiedBuyers: true,
        };

        const mockedAnswer = {
            userId,
            assetId: createAnswersDto.assetId,
            responses: createAnswersDto.responses,
            questionnaire: questionnaire,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(questionnaire);
        jest.spyOn(answersRepo, 'create').mockReturnValue(mockedAnswer);
        jest.spyOn(answersRepo.getEntityManager(), 'persistAndFlush').mockResolvedValue(mockedAnswer);

        const result = await service.submitAnswers(questionnaire.id, questionnaire.version, createAnswersDto, userId);

        expect(result).toEqual(mockedAnswer);
        expect(answersRepo.getEntityManager().persistAndFlush).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledWith({
            id: questionnaire.id,
            version: questionnaire.version,
            isActive: true,
        });
        expect(answersRepo.create).toHaveBeenCalledTimes(1);
        expect(answersRepo.create).toHaveBeenCalledWith({
            userId,
            assetId: createAnswersDto.assetId,
            responses: createAnswersDto.responses,
            questionnaire,
        });
    });

    it('should throw exception when submitting answers for a nonexistent questionnaire', async () => {
        questionnaireRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });
        jest.spyOn(answersRepo.getEntityManager(), 'persistAndFlush').mockImplementation();

        try {
            await service.submitAnswers('123', 5, createAnswersDto, userId);
            expect(answersRepo.getEntityManager().persistAndFlush).toHaveBeenCalledTimes(0);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
        }
    });

    it('should return answers for an asset', async () => {
        const assetIdParam = '100';

        const answers = [
            {
                id: '1',
                assetId: assetIdParam,
            },
            {
                id: '2',
                assetId: assetIdParam,
            },
        ];
        jest.spyOn(answersRepo, 'find').mockResolvedValue(answers);

        const result = await service.getAnswers(assetIdParam);
        expect(result).toEqual(answers);

        expect(answersRepo.find).toHaveBeenCalledTimes(1);
        expect(answersRepo.find).toHaveBeenCalledWith(
            {
                assetId: assetIdParam,
            },
            {
                fields: ['responses'],
            },
        );
    });
});
