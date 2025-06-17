import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Patch,
    Post,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiNotFoundResponse,
    ApiResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { logs } from '@opentelemetry/api-logs';
import { ADMIN_ROLE, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { CreateQuestionnaireDto } from '../dto/create-questionnaire.dto';
import { Answer } from '../entities';
import { TransformAnswersInterceptor } from '../interceptors';
import { AnswersService, QuestionnaireService } from '../services';

@Controller('questionnaire')
@ApiTags('questionnaire')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
    description: 'Unauthorized.',
    schema: {
        example: {
            message: 'Unauthorized',
            status: 401,
        },
    },
})
@ApiNotFoundResponse({
    description: 'NotFound.',
    schema: {
        example: {
            message: 'NotFound',
            status: 404,
        },
    },
})
export class QuestionnaireController {
    private readonly logger = logs.getLogger(QuestionnaireController.name);
    constructor(
        private readonly questionnairesService: QuestionnaireService,
        private readonly answersService: AnswersService,
    ) {}

    @Get()
    @ApiResponse({
        description: 'Questionnaires versions',
        schema: {
            example: [
                {
                    id: 'e96f396b-10ba-4164-96be-e432056e2114',
                    version: '9',
                    isForVerifiedBuyers: false,
                    title: 'General Questionnaire',
                    isActive: true,
                    publicationDate: new Date(),
                },
            ],
        },
        status: 200,
    })
    async getVersions() {
        return this.questionnairesService.getVersions();
    }

    @Get(':assetId/active-questionnaire/verified-buyers')
    @ApiResponse({
        description: 'User questionnaires',
        schema: {
            example: {
                id: 'e96f396b-10ba-4164-96be-e432056e2114',
                version: '9',
                title: 'User questionnaires',
                description: 'test description',
                questions: [
                    {
                        id: '16e15fa3-f745-4b7f-8953-91969209c96a',
                        type: 'Checkbox',
                        title: 'Checkbox question',
                        isRequired: true,
                        options: [
                            {
                                text: 'Text 1',
                                description: 'Description 1',
                            },
                            {
                                text: 'Text 2',
                                description: 'Description 2',
                            },
                        ],
                    },
                ],
            },
        },
        status: 200,
    })
    async getUserQuestionnaireVerifiedBuyers(
        @Param('assetId') assetId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ) {
        return await this.answersService.getUserQuestionnaire(assetId, user.id, true);
    }

    @Get(':assetId/active-questionnaire/general-users')
    @ApiResponse({
        description: 'User questionnaires',
        schema: {
            example: {
                id: 'e96f396b-10ba-4164-96be-e432056e2114',
                version: '9',
                title: 'User questionnaires',
                description: 'test description',
                questions: [
                    {
                        id: '16e15fa3-f745-4b7f-8953-91969209c96a',
                        type: 'Checkbox',
                        title: 'Checkbox question',
                        isRequired: true,
                        options: [
                            {
                                text: 'Text 1',
                                description: 'Description 1',
                            },
                            {
                                text: 'Text 2',
                                description: 'Description 2',
                            },
                        ],
                    },
                ],
            },
        },
        status: 200,
    })
    async getUserQuestionnaireGeneralUsers(
        @Param('assetId') assetId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ) {
        return await this.answersService.getUserQuestionnaire(assetId, user.id, false);
    }

    @Get('active-version/verified-buyers')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiResponse({
        description: 'Active verified buyers questionnaire',
        schema: {
            example: {
                id: 'e96f396b-10ba-4164-96be-e432056e2114',
                version: '9',
                title: 'User questionnaires',
                description: 'test description',
                questions: [
                    {
                        id: '16e15fa3-f745-4b7f-8953-91969209c96a',
                        type: 'Checkbox',
                        title: 'Checkbox question',
                        isRequired: true,
                        options: [
                            {
                                text: 'Text 1',
                                description: 'Description 1',
                            },
                            {
                                text: 'Text 2',
                                description: 'Description 2',
                            },
                        ],
                    },
                ],
            },
        },
        status: 200,
    })
    async findActiveVersionForVerifiedBuyers() {
        return this.answersService.findActiveVersion(true);
    }

    @Get('active-version/general-users')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiResponse({
        description: 'Active general questionnaire',
        schema: {
            example: {
                id: 'e96f396b-10ba-4164-96be-e432056e2114',
                version: '9',
                title: 'User questionnaires',
                description: 'test description',
                questions: [
                    {
                        id: '16e15fa3-f745-4b7f-8953-91969209c96a',
                        type: 'Checkbox',
                        title: 'Checkbox question',
                        isRequired: true,
                        options: [
                            {
                                text: 'Text 1',
                                description: 'Description 1',
                            },
                            {
                                text: 'Text 2',
                                description: 'Description 2',
                            },
                        ],
                    },
                ],
            },
        },
        status: 200,
    })
    async findActiveVersionForGeneralUsers() {
        return this.answersService.findActiveVersion(false);
    }

    @Get(':assetId/answers')
    @UseInterceptors(TransformAnswersInterceptor)
    @ApiResponse({
        description: 'Questionnaire answers',
        schema: {
            example: [
                {
                    questionId: 'e96f396b-10ba-4164-96be-e432056e2114',
                    questionTitle: 'User questionnaires',
                    responses: ['General text 1', 'General text 2'],
                },
            ],
        },
        status: 200,
    })
    async getAnswers(@Param('assetId') assetId: string) {
        return this.answersService.getAnswers(assetId);
    }

    @Post()
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiBody({ type: CreateQuestionnaireDto })
    @ApiResponse({
        description: ' Create Questionnaire',
        schema: {
            example: {
                id: '2f99b000-5622-4e75-a84b-6960d235f110',
                version: '8',
                questions: [
                    {
                        id: '3b833d31-22a3-411e-8df0-f9de05251330',
                        type: 'Text',
                        title: 'Text Question',
                        description: null,
                        isRequired: true,
                        options: [],
                        questionnaire: {
                            id: '2f99b000-5622-4e75-a84b-6960d235f110',
                            version: '8',
                            answers: [],
                            creatorId: '1234',
                            isForVerifiedBuyers: true,
                            title: 'New Questionnaire Test',
                            description: 'Test description',
                            isActive: false,
                            createdAt: '2024-06-17T11:37:48.772Z',
                            updatedAt: '2024-06-17T11:37:48.772Z',
                        },
                        createdAt: '2024-06-17T11:37:48.772Z',
                        updatedAt: '2024-06-17T11:37:48.772Z',
                    },
                ],
                answers: [],
                creatorId: '1234',
                isForVerifiedBuyers: true,
                title: 'New Questionnaire Test',
                description: 'Test description',
                isActive: false,
                createdAt: '2024-06-17T11:37:48.772Z',
                updatedAt: '2024-06-17T11:37:48.772Z',
            },
        },
        status: 200,
    })
    async create(@Body() data: CreateQuestionnaireDto) {
        return this.questionnairesService.create(data);
    }

    @Patch(':id/:version/activate')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiResponse({
        description: 'Activate Questionnaire',
        schema: {
            example: {
                id: 'e65e6e58-680f-4d9d-ba5e-53e2a90da367',
                version: '1',
                isForVerifiedBuyers: true,
                isActive: true,
                publicationDate: '2024-06-17T11:42:58.356Z',
            },
        },
        status: 200,
    })
    async activate(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return this.questionnairesService.activate(id, version);
    }

    @Patch(':id/:version/deactivate')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiResponse({
        description: 'Deactivate Questionnaire',
        schema: {
            example: {
                id: 'e65e6e58-680f-4d9d-ba5e-53e2a90da367',
                version: '1',
                isActive: false,
            },
        },
        status: 200,
    })
    async deactivate(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return this.questionnairesService.deactivate(id, version);
    }

    @Get(':id/:version')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiResponse({
        description: 'Questionnaires',
        schema: {
            example: {
                id: 'db469342-d725-4d20-b06d-0ffa6feaeb76',
                version: '4',
                isForVerifiedBuyers: true,
                title: 'Questionnaire Test',
                description: 'Description test',
                isActive: false,
                questions: [
                    {
                        id: '2f4b8756-4203-486f-90ee-25dd296d6283',
                        type: 'Text',
                        title: 'Question title',
                        isRequired: true,
                        options: [],
                    },
                ],
            },
        },
        status: 200,
    })
    async find(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return this.questionnairesService.find(id, version);
    }

    @Delete(':id/:version')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiResponse({ description: 'Delete questionnaire', schema: { example: {} }, status: 200 })
    @ApiBadRequestResponse({
        description: 'Bad request',
        schema: {
            example: {
                message: 'You cannot delete the questionnaire, as there are already responses collected',
                status: 400,
            },
        },
    })
    async delete(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return this.questionnairesService.delete(id, version);
    }

    @Post(':id/:version/answers')
    @ApiBody({ type: CreateAnswerDto })
    @ApiResponse({
        description: 'Answers',
        schema: {
            example: {
                id: 'bd1d45ff-c810-4e97-affa-7834b7d8c4dc',
                responses: [
                    {
                        questionId: '06b7fc3d-4c2c-40ef-8f16-1852030df489',
                        questionTitle: 'Question Title',
                        text: 'Answer test',
                    },
                ],
                userId: '06352836-251e-4eaa-9990-5e252f0c0364',
                assetId: '100',
                questionnaire: {
                    id: 'e96f396b-10ba-4164-96be-e432056e2114',
                    version: '9',
                    creatorId: '06352836-251a-4eaa-9990-5e252e0c0364',
                    isForVerifiedBuyers: false,
                    title: 'General questionnaire',
                    description: 'Test description',
                    isActive: true,
                    publicationDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                createdAt: new Date(),
            },
        },
        status: 200,
    })
    async submitAnswers(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
        @Body() data: CreateAnswerDto,
    ): Promise<Answer> {
        return this.answersService.submitAnswers(id, version, data, user.id);
    }
}
