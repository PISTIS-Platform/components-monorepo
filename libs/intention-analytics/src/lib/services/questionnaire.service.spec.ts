import { BadRequestException, NotFoundException } from '@nestjs/common';

import { QuestionType } from '../constants';
import { CreateQuestionnaireDto } from '../dto/create-questionnaire.dto';
import { QuestionnaireService } from './questionnaire.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('QuestionnaireService', () => {
    let service: QuestionnaireService;

    let questionnaireRepo: any;
    let questionRepo: any;
    let createDto: CreateQuestionnaireDto;

    beforeEach(async () => {
        questionnaireRepo = {
            findOneOrFail: jest.fn(),
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            nativeUpdate: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: () => jest.fn(),
                flush: () => jest.fn(),
                removeAndFlush: () => jest.fn(),
            }),
        };

        questionRepo = {
            create: jest.fn(),
            add: jest.fn(),
        };
        service = new QuestionnaireService(questionnaireRepo, questionRepo);

        createDto = {
            isForVerifiedBuyers: true,
            isActive: false,
            title: 'New Questionnaire',
            description: 'Test description',
            creatorId: '123',
            questions: [
                {
                    title: 'Question 1',
                    type: QuestionType.TEXT,
                    isRequired: true,
                    description: 'question description',
                },
                {
                    title: 'Question 2',
                    type: QuestionType.CHECKBOX,
                    isRequired: true,
                    options: [{ text: 'Option1' }, { text: 'Option2' }],
                },
            ],
        };
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return questionnaire versions', async () => {
        const versions = [
            { id: '1', title: 'Title test' },
            { id: '1', title: 'Title test' },
        ];
        jest.spyOn(questionnaireRepo, 'findAll').mockResolvedValue(versions);

        expect(await service.getVersions()).toEqual(versions);
    });

    it('should create new questionnaire', async () => {
        const mockQuestionnaire = {
            id: '1',
            version: 1,
            ...createDto,
            ...{
                questions: {
                    add: jest.fn(),
                },
            },
        };

        const createdQuestions = createDto.questions.map((questionItem) => ({
            ...questionItem,
            questionnaire: mockQuestionnaire,
        }));

        questionRepo.create.mockImplementation((question: any) => question);
        jest.spyOn(mockQuestionnaire.questions, 'add').mockReturnValue(createdQuestions);
        jest.spyOn(questionnaireRepo, 'findOne').mockResolvedValue(null);
        jest.spyOn(questionnaireRepo, 'create').mockReturnValue(mockQuestionnaire);
        jest.spyOn(questionnaireRepo.getEntityManager(), 'flush').mockImplementation();

        expect(await service.create(createDto)).toEqual(mockQuestionnaire);
        expect(questionnaireRepo.getEntityManager().flush).toHaveBeenCalledTimes(1);

        //test that create questionnaire was called with the correct parameters
        expect(questionnaireRepo.create).toHaveBeenCalledWith({
            title: createDto.title,
            description: createDto?.description || null,
            isForVerifiedBuyers: createDto.isForVerifiedBuyers,
            isActive: createDto.isActive,
            creatorId: createDto.creatorId,
            version: 1,
        });

        //test that questions were added too
        expect(questionRepo.create).toHaveBeenCalledTimes(2);
        expect(questionRepo.create).toHaveBeenCalledWith({
            title: createDto.questions[0].title,
            description: createDto.questions[0].description,
            type: QuestionType.TEXT,
            isRequired: true,
            options: undefined,
            questionnaire: mockQuestionnaire,
        });
        expect(questionRepo.create).toHaveBeenCalledWith({
            title: createDto.questions[1].title,
            description: null,
            type: QuestionType.CHECKBOX,
            isRequired: true,
            options: createDto.questions[1].options,
            questionnaire: mockQuestionnaire,
        });
    });

    it('should create new version for an existing questionnaire', async () => {
        const existingQuestionnaire = {
            id: '1',
            version: 1,
            ...createDto,
            ...{
                questions: {
                    add: jest.fn(),
                },
            },
        };

        const newQuestionnaire = {
            id: '1',
            version: 2,
            ...createDto,
            ...{
                questions: {
                    add: jest.fn(),
                },
            },
        };

        const createdQuestions = createDto.questions.map((questionItem) => ({
            ...questionItem,
            questionnaire: newQuestionnaire,
        }));

        questionRepo.create.mockImplementation((question: any) => question);
        jest.spyOn(questionnaireRepo, 'findOne').mockResolvedValue(existingQuestionnaire);
        jest.spyOn(questionnaireRepo, 'create').mockReturnValue(newQuestionnaire);
        jest.spyOn(newQuestionnaire.questions, 'add').mockReturnValue(createdQuestions);
        jest.spyOn(questionnaireRepo.getEntityManager(), 'flush').mockImplementation();

        expect(await service.create(createDto)).toEqual(newQuestionnaire);
        expect(questionnaireRepo.create).toHaveBeenCalledWith({
            title: createDto.title,
            description: createDto?.description || null,
            isForVerifiedBuyers: createDto.isForVerifiedBuyers,
            isActive: createDto.isActive,
            creatorId: createDto.creatorId,
            version: 2,
        });
    });

    it('should activate the newly created questionnaire when users selects so', async () => {
        createDto['isActive'] = true;

        const existingQuestionnaire = {
            id: '1',
            version: 1,
            isActive: true,
            ...{
                questions: {
                    add: jest.fn(),
                },
            },
        };

        const newQuestionnaire = {
            id: '1',
            version: 2,
            isActive: true,
            ...{
                questions: {
                    add: jest.fn(),
                },
            },
        };

        const createdQuestions = createDto.questions.map((questionItem) => ({
            ...questionItem,
            questionnaire: newQuestionnaire,
        }));

        questionRepo.create.mockImplementation((question: any) => question);
        jest.spyOn(questionnaireRepo, 'findOne').mockResolvedValue(existingQuestionnaire);
        jest.spyOn(questionnaireRepo, 'create').mockReturnValue(newQuestionnaire);
        jest.spyOn(newQuestionnaire.questions, 'add').mockReturnValue(createdQuestions);
        jest.spyOn(questionnaireRepo, 'nativeUpdate').mockResolvedValue(null);
        jest.spyOn(questionnaireRepo.getEntityManager(), 'flush').mockImplementation();

        expect(await service.create(createDto)).toEqual(newQuestionnaire);
        expect(questionnaireRepo.nativeUpdate).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.nativeUpdate).toHaveBeenCalledWith(
            {
                isForVerifiedBuyers: createDto.isForVerifiedBuyers,
            },
            { isActive: false },
        );
    });

    it('should activate questionnaire', async () => {
        const existingQuestionnaire = {
            id: '1',
            version: 1,
            ...createDto,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(existingQuestionnaire);

        jest.spyOn(questionnaireRepo, 'nativeUpdate').mockResolvedValue(null);
        jest.spyOn(questionnaireRepo.getEntityManager(), 'flush').mockImplementation();

        const result = await service.activate(existingQuestionnaire.id, existingQuestionnaire.version);

        expect(result).toEqual(existingQuestionnaire);
        expect(result.publicationDate).toBeInstanceOf(Date);
        expect(result.isActive).toBe(true);

        expect(questionnaireRepo.getEntityManager().flush).toHaveBeenCalledTimes(1);

        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledWith(
            { id: existingQuestionnaire.id, version: existingQuestionnaire.version },
            { fields: ['id', 'version', 'isActive', 'isForVerifiedBuyers', 'publicationDate'] },
        );

        expect(questionnaireRepo.nativeUpdate).toHaveBeenCalledWith(
            { isForVerifiedBuyers: existingQuestionnaire.isForVerifiedBuyers },
            { isActive: false },
        );
    });

    it('should throw exception when activating a nonexistent questionnaire', async () => {
        questionnaireRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        jest.spyOn(questionnaireRepo.getEntityManager(), 'flush').mockImplementation();
        jest.spyOn(questionnaireRepo, 'nativeUpdate').mockImplementation();

        try {
            await service.activate('abc', 2);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(questionnaireRepo.nativeUpdate).toHaveBeenCalledTimes(0);
            expect(questionnaireRepo.getEntityManager().flush).toHaveBeenCalledTimes(0);
        }
    });

    it('should deactivate questionnaire', async () => {
        const existingQuestionnaire = {
            id: '1',
            version: 1,
            ...createDto,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(existingQuestionnaire);

        jest.spyOn(questionnaireRepo, 'nativeUpdate').mockResolvedValue(null);
        jest.spyOn(questionnaireRepo.getEntityManager(), 'flush').mockImplementation();

        const result = await service.deactivate(existingQuestionnaire.id, existingQuestionnaire.version);
        expect(result).toEqual(existingQuestionnaire);
        expect(result.isActive).toBe(false);

        expect(questionnaireRepo.getEntityManager().flush).toHaveBeenCalledTimes(1);

        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledWith(
            { id: existingQuestionnaire.id, version: existingQuestionnaire.version },
            { fields: ['id', 'version', 'isActive'] },
        );
    });

    it('should throw exception when deactivating a nonexistent questionnaire', async () => {
        questionnaireRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        jest.spyOn(questionnaireRepo.getEntityManager(), 'flush').mockImplementation();

        try {
            await service.deactivate('abc', 2);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(questionnaireRepo.getEntityManager().flush).toHaveBeenCalledTimes(0);
        }
    });

    it('should delete a questionnaire version', async () => {
        const existingQuestionnaire = {
            id: '1',
            version: 1,
            answers: [],
            ...createDto,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(existingQuestionnaire);
        jest.spyOn(questionnaireRepo.getEntityManager(), 'removeAndFlush').mockResolvedValue(null);

        const result = await service.delete(existingQuestionnaire.id, existingQuestionnaire.version);
        expect(result).toEqual(null);

        expect(questionnaireRepo.getEntityManager().removeAndFlush).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.getEntityManager().removeAndFlush).toHaveBeenCalledWith(existingQuestionnaire);

        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledWith(
            { id: existingQuestionnaire.id, version: existingQuestionnaire.version },
            { populate: ['questions', 'answers'] },
        );
    });

    it('should throw exception when deleting questionnaire with answers', async () => {
        const existingQuestionnaire = {
            id: '1',
            version: 1,
            answers: [{ id: '1' }],
            ...createDto,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(existingQuestionnaire);
        jest.spyOn(questionnaireRepo.getEntityManager(), 'removeAndFlush').mockImplementation();

        try {
            await service.delete(existingQuestionnaire.id, existingQuestionnaire.version);
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestException);
            expect((e as BadRequestException).message).toBe(
                'You cannot delete the questionnaire, as there are already responses collected',
            );
            expect(questionnaireRepo.getEntityManager().removeAndFlush).toHaveBeenCalledTimes(0);
        }
    });

    it('should throw exception when deleting a nonexistent questionnaire', async () => {
        questionnaireRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });
        jest.spyOn(questionnaireRepo.getEntityManager(), 'removeAndFlush').mockImplementation();

        try {
            await service.delete('abc', 2);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(questionnaireRepo.getEntityManager().removeAndFlush).toHaveBeenCalledTimes(0);
        }
    });

    it('should find a questionnaire', async () => {
        const existingQuestionnaire = {
            id: '1',
            version: 1,
            ...createDto,
        };

        jest.spyOn(questionnaireRepo, 'findOneOrFail').mockResolvedValue(existingQuestionnaire);

        const result = await service.find(existingQuestionnaire.id, existingQuestionnaire.version);
        expect(result).toEqual(existingQuestionnaire);

        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(questionnaireRepo.findOneOrFail).toHaveBeenCalledWith(
            {
                id: existingQuestionnaire.id,
                version: existingQuestionnaire.version,
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
    });

    it('should throw exception when finding a nonexistent questionnaire', async () => {
        questionnaireRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        try {
            await service.find('abc', 2);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
        }
    });
});
