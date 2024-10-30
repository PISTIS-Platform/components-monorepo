import { UserInfo } from '@pistis/shared';

import { QuestionType } from '../constants';
import { CreateAnswerDto } from '../dto/create-answer.dto';
import { CreateQuestionnaireDto } from '../dto/create-questionnaire.dto';
import { QuestionnaireController } from './questionnaire.controller';

describe('QuestionnaireController', () => {
    let controller: QuestionnaireController;
    let questionnairesService: any;
    let answersService: any;
    let versions: any[];
    let authUser: UserInfo;

    beforeEach(async () => {
        questionnairesService = {
            getVersions: () => jest.fn(),
            create: () => jest.fn(),
            activate: () => jest.fn(),
            deactivate: () => jest.fn(),
            delete: () => jest.fn(),
            find: () => jest.fn(),
        };

        answersService = {
            findActiveVersion: () => jest.fn(),
            submitAnswers: () => jest.fn(),
            getAnswers: () => jest.fn(),
            getUserQuestionnaire: () => jest.fn(),
        };

        controller = new QuestionnaireController(questionnairesService, answersService);

        versions = [
            {
                id: 'db469342-d725-4d20-b06d-0ffa6feaeb76',
                version: 1,
                isForVerifiedBuyers: true,
                isActive: true,
                title: 'New Active Questionnaire',
                publicationDate: null,
            },
            {
                id: 'db469342-d725-4d20-b06d-0ffa6feaeb89',
                version: 1,
                isForVerifiedBuyers: true,
                isActive: false,
                title: 'New Questionnaire',
                publicationDate: null,
            },
            {
                id: 'db469342-d725-4d20-b06d-0ffa6feaeb90',
                version: 2,
                isForVerifiedBuyers: false,
                isActive: false,
                title: 'General Questionnaire',
                publicationDate: null,
            },
            {
                id: 'db469342-d725-4d20-b06d-0ffa6feaeb91',
                version: 2,
                isForVerifiedBuyers: false,
                isActive: true,
                title: 'General Questionnaire',
                publicationDate: null,
            },
        ];

        authUser = {
            id: '1',
            organizationId: '1234',
        };
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return questionnaire versions', async () => {
        jest.spyOn(questionnairesService, 'getVersions').mockResolvedValue(versions);
        expect(await controller.getVersions()).toBe(versions);
    });

    it('should return active version for verified buyers', async () => {
        const activeVersionForVerifiedBuyers = versions[0];

        jest.spyOn(answersService, 'findActiveVersion').mockResolvedValue(activeVersionForVerifiedBuyers);
        expect(await controller.findActiveVersionForVerifiedBuyers()).toBe(activeVersionForVerifiedBuyers);

        expect(answersService.findActiveVersion).toHaveBeenCalledWith(true);
    });

    it('should return active version for general users', async () => {
        const activeVersionForGeneralUsers = versions[3];

        jest.spyOn(answersService, 'findActiveVersion').mockResolvedValue(activeVersionForGeneralUsers);
        expect(await controller.findActiveVersionForGeneralUsers()).toBe(activeVersionForGeneralUsers);

        expect(answersService.findActiveVersion).toHaveBeenCalledWith(false);
    });

    it('should return answers', async () => {
        const answers = [
            { id: '1', assetId: '100' },
            { id: '2', assetId: '100' },
        ];

        jest.spyOn(answersService, 'getAnswers').mockResolvedValue(answers);
        expect(await controller.getAnswers('100')).toBe(answers);

        expect(answersService.getAnswers).toHaveBeenCalledWith('100');
    });

    it('should create a questionnaire', async () => {
        const questionnaire = versions[0];
        const createDto: CreateQuestionnaireDto = {
            isForVerifiedBuyers: true,
            isActive: true,
            title: 'New Active Questionnaire',
            description: 'Test description',
            creatorId: '123',
            questions: [
                {
                    title: 'Question 1',
                    type: QuestionType.TEXT,
                    isRequired: true,
                },
                {
                    title: 'Question 2',
                    type: QuestionType.CHECKBOX,
                    isRequired: true,
                },
            ],
        };

        jest.spyOn(questionnairesService, 'create').mockResolvedValue(questionnaire);
        expect(await controller.create(createDto)).toBe(questionnaire);

        expect(questionnairesService.create).toHaveBeenCalledWith(createDto);
    });

    it('should activate a questionnaire version', async () => {
        const questionnaire = versions[1];

        jest.spyOn(questionnairesService, 'activate').mockResolvedValue(questionnaire);
        expect(await controller.activate(questionnaire.id, questionnaire.version)).toBe(questionnaire);

        expect(questionnairesService.activate).toHaveBeenCalledWith(questionnaire.id, questionnaire.version);
    });

    it('should deactivate a questionnaire version', async () => {
        const questionnaire = versions[2];

        jest.spyOn(questionnairesService, 'deactivate').mockResolvedValue(questionnaire);
        expect(await controller.deactivate(questionnaire.id, questionnaire.version)).toBe(questionnaire);

        expect(questionnairesService.deactivate).toHaveBeenCalledWith(questionnaire.id, questionnaire.version);
    });

    it('should find a questionnaire version', async () => {
        const questionnaire = versions[2];

        jest.spyOn(questionnairesService, 'find').mockResolvedValue(questionnaire);
        expect(await controller.find(questionnaire.id, questionnaire.version)).toBe(questionnaire);

        expect(questionnairesService.find).toHaveBeenCalledWith(questionnaire.id, questionnaire.version);
    });

    it('should delete a questionnaire version', async () => {
        const questionnaire = versions[2];

        jest.spyOn(questionnairesService, 'delete').mockResolvedValue(null);
        expect(await controller.delete(questionnaire.id, questionnaire.version)).toBe(null);

        expect(questionnairesService.delete).toHaveBeenCalledWith(questionnaire.id, questionnaire.version);
    });

    it('should submit answers for a questionnaire version', async () => {
        const questionnaire = versions[0];

        const answersDto: CreateAnswerDto = {
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
                    text: 'Testing 2',
                },
            ],
        };

        const createdAnswer = { id: 1 };

        jest.spyOn(answersService, 'submitAnswers').mockResolvedValue(createdAnswer);
        expect(await controller.submitAnswers(authUser, questionnaire.id, questionnaire.version, answersDto)).toBe(
            createdAnswer,
        );

        expect(answersService.submitAnswers).toHaveBeenCalledWith(
            questionnaire.id,
            questionnaire.version,
            answersDto,
            authUser.id,
        );
    });

    it('should return active version for answering questionnaire for verified buyers', async () => {
        const activeVersionForVerifiedBuyers = versions[0];
        const assetId = '100';

        jest.spyOn(answersService, 'getUserQuestionnaire').mockResolvedValue(activeVersionForVerifiedBuyers);
        expect(await controller.getUserQuestionnaireVerifiedBuyers(assetId, authUser)).toBe(
            activeVersionForVerifiedBuyers,
        );

        expect(answersService.getUserQuestionnaire).toHaveBeenCalledWith(assetId, authUser.id, true);
    });

    it('should return active version for answering questionnaire for general users', async () => {
        const activeVersionForGeneralUsers = versions[3];
        const assetId = '100';

        jest.spyOn(answersService, 'getUserQuestionnaire').mockResolvedValue(activeVersionForGeneralUsers);
        expect(await controller.getUserQuestionnaireGeneralUsers(assetId, authUser)).toBe(activeVersionForGeneralUsers);

        expect(answersService.getUserQuestionnaire).toHaveBeenCalledWith(assetId, authUser.id, false);
    });
});
