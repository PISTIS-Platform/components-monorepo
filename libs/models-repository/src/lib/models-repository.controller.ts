import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { FormDataRequest } from 'nestjs-form-data';

import { CreateModelDTO, UpdateModelDTO } from './dto';
import { ModelsRepositoryService } from './models-repository.service';

@Controller('models')
@ApiTags('models-repository')
@ApiBearerAuth()
export class ModelsRepositoryController {
    constructor(private readonly modelsService: ModelsRepositoryService) {}

    @Post()
    @FormDataRequest()
    async createModel(@Body() file: CreateModelDTO) {
        return await this.modelsService.createModel(file);
    }

    @Put(':modelId')
    async updateModel(@Param('modelId') modelId: string, @Body() model: UpdateModelDTO) {
        return await this.modelsService.updateModel(modelId, model);
    }

    @Get()
    async findAllModels() {
        return await this.modelsService.findAllModels();
    }

    @Get(':modelId/download')
    @Public()
    async downloadModel(@Param('modelId') modelId: string, @Res() res: Response) {
        return await this.modelsService.downloadModel(modelId, res);
    }

    @Get(':modelId')
    async findModelById(@Param('modelId') modelId: string) {
        return await this.modelsService.findModelByIdWithSpecificFields(modelId);
    }

    @Delete(':modelId')
    async deleteModel(@Param('modelId') modelId: string) {
        return await this.modelsService.deleteModel(modelId);
    }
}
