import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';

import { CreateAnswerDto } from '../dto/create-answer.dto';
import { CreateQuestionnaireDto } from '../dto/create-questionnaire.dto';
import { AnswersService, QuestionnaireService } from '../services';

@Controller('questionnaire')
@ApiTags('questionnaire')
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
    async findActiveVersionForVerifiedBuyers() {
        return await this.answersService.findActiveVersion(true);
    }

    @Get('active-version/general-users')
    async findActiveVersionForGeneralUsers() {
        return await this.answersService.findActiveVersion(false);
    }

    @Post()
    @ApiBody({ type: CreateQuestionnaireDto })
    async create(@Body() data: CreateQuestionnaireDto) {
        return await this.questionnairesService.create(data);
    }

    @Patch(':id/:version/activate')
    async activate(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.activate(id, version);
    }

    @Patch(':id/:version/deactivate')
    async deactivate(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.deactivate(id, version);
    }

    @Get(':id/:version')
    async find(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.find(id, version);
    }

    @Delete(':id/:version')
    async delete(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
    ) {
        return await this.questionnairesService.delete(id, version);
    }

    @Post(':id/:version/answers')
    @ApiBody({ type: CreateAnswerDto })
    async submitAnswers(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Param('version', new ParseIntPipe()) version: number,
        @Body() data: CreateAnswerDto,
    ) {
        return await this.answersService.submitAnswers(id, version, data);
    }
}
