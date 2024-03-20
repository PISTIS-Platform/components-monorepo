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
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
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
export class QuestionnaireController {
    constructor(
        private readonly questionnairesService: QuestionnaireService,
        private readonly answersService: AnswersService,
    ) {}

    @Get()
    async getVersions() {
        return await this.questionnairesService.getVersions();
    }

    @Get('active-version/verified-buyers')
    @Roles({ roles: [ADMIN_ROLE] })
    async findActiveVersionForVerifiedBuyers() {
        return await this.answersService.findActiveVersion(true);
    }

    @Get('active-version/general-users')
    @Roles({ roles: [ADMIN_ROLE] })
    async findActiveVersionForGeneralUsers() {
        return await this.answersService.findActiveVersion(false);
    }

    @Get(':assetId/answers')
    @UseInterceptors(TransformAnswersInterceptor)
    async getAnswers(@Param('assetId') assetId: string) {
        return await this.answersService.getAnswers(assetId);
    }

    @Post()
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiBody({ type: CreateQuestionnaireDto })
    async create(@Body() data: CreateQuestionnaireDto) {
        return await this.questionnairesService.create(data);
    }

    @Patch(':id/:version/activate')
    @Roles({ roles: [ADMIN_ROLE] })
    async activate(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.activate(id, version);
    }

    @Patch(':id/:version/deactivate')
    @Roles({ roles: [ADMIN_ROLE] })
    async deactivate(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.deactivate(id, version);
    }

    @Get(':id/:version')
    @Roles({ roles: [ADMIN_ROLE] })
    async find(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.find(id, version);
    }

    @Delete(':id/:version')
    @Roles({ roles: [ADMIN_ROLE] })
    async delete(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.delete(id, version);
    }

    @Post(':id/:version/answers')
    @ApiBody({ type: CreateAnswerDto })
    async submitAnswers(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
        @Body() data: CreateAnswerDto,
    ): Promise<Answer> {
        return this.answersService.submitAnswers(id, version, data, user.id);
    }
}
