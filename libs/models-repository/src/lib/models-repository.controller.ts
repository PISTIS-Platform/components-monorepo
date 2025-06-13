import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { ADMIN_ROLE } from '@pistis/shared';
import { Response } from 'express';
import { Public, Roles } from 'nest-keycloak-connect';
import { FormDataRequest } from 'nestjs-form-data';

import { CreateModelDTO, UpdateModelDTO } from './dto';
import { ModelsRepositoryService } from './models-repository.service';

@Controller('models')
@ApiTags('models-repository')
@ApiBearerAuth()
export class ModelsRepositoryController {
    private readonly logger = logs.getLogger(ModelsRepositoryController.name);
    constructor(private readonly modelsService: ModelsRepositoryService) {}

    @Post()
    @Roles({ roles: [ADMIN_ROLE] })
    @FormDataRequest()
    @ApiOkResponse({
        description: 'Factories',
        schema: {
            example: [
                {
                    id: '768004e7-33b1-4248-bafe-04688f49f161',
                    title: 'Data Model',
                    description: 'test description',
                    type: '',
                    version: 'v1.0',
                    size: 12.01,
                    data: Buffer.from([0o1, 89, 56]),
                    filepath: 'srv/models',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
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
    @ApiUnauthorizedResponse()
    @ApiBody({ type: CreateModelDTO })
    async createModel(@Body() file: CreateModelDTO) {
        this.logger.emit({
            severityNumber: SeverityNumber.TRACE,
            severityText: 'trace',
            body: ``,
            attributes: { route: `/api/models`, method: 'POST', timestamp: new Date().toISOString() },
        });
        return await this.modelsService.createModel(file);
    }

    @Put(':modelId')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({
        description: 'Factories',
        schema: {
            example: [
                {
                    id: '768004e7-33b1-4248-bafe-04688f49f161',
                    title: 'Data Model',
                    description: 'test description',
                    type: '',
                    version: 'v1.0',
                    size: 12.01,
                    data: Buffer.from([0o1, 89, 56]),
                    filepath: 'srv/models',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
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
    @ApiUnauthorizedResponse()
    @ApiBody({ type: UpdateModelDTO })
    async updateModel(@Param('modelId') modelId: string, @Body() model: UpdateModelDTO) {
        this.logger.emit({
            severityNumber: SeverityNumber.TRACE,
            severityText: 'trace',
            body: ``,
            attributes: { route: `/api/models/${modelId}`, method: 'PUT', timestamp: new Date().toISOString() },
        });
        return await this.modelsService.updateModel(modelId, model);
    }

    @Get()
    @ApiOkResponse({
        description: 'Factories',
        schema: {
            example: [
                {
                    id: '768004e7-33b1-4248-bafe-04688f49f161',
                    title: 'Data Model',
                    description: 'test description',
                    type: '',
                    version: 'v1.0',
                    size: 12.01,
                    data: Buffer.from([0o1, 89, 56]),
                    filepath: 'srv/models',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
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
    @ApiUnauthorizedResponse()
    async findAllModels() {
        this.logger.emit({
            severityNumber: SeverityNumber.TRACE,
            severityText: 'trace',
            body: ``,
            attributes: { route: `/api/models`, method: 'GET', timestamp: new Date().toISOString() },
        });
        return await this.modelsService.findAllModels();
    }

    @Get(':modelId/download')
    @Public()
    @ApiOkResponse({})
    @ApiUnauthorizedResponse()
    async downloadModel(@Param('modelId') modelId: string, @Res() res: Response) {
        this.logger.emit({
            severityNumber: SeverityNumber.TRACE,
            severityText: 'trace',
            body: ``,
            attributes: {
                route: `/api/models/${modelId}/download`,
                method: 'GET',
                timestamp: new Date().toISOString(),
            },
        });
        return await this.modelsService.downloadModel(modelId, res);
    }

    @Get(':modelId')
    @ApiOkResponse({
        description: 'Factories',
        schema: {
            example: [
                {
                    id: '768004e7-33b1-4248-bafe-04688f49f161',
                    title: 'Data Model',
                    description: 'test description',
                    type: '',
                    version: 'v1.0',
                    size: 12.01,
                    data: Buffer.from([0o1, 89, 56]),
                    filepath: 'srv/models',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
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
    @ApiUnauthorizedResponse()
    async findModelById(@Param('modelId') modelId: string) {
        this.logger.emit({
            severityNumber: SeverityNumber.TRACE,
            severityText: 'trace',
            body: ``,
            attributes: { route: `/api/models/${modelId}`, method: 'GET', timestamp: new Date().toISOString() },
        });
        return await this.modelsService.findModelByIdWithSpecificFields(modelId);
    }

    @Delete(':modelId')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({ description: 'Model delete', schema: { example: 'Model deleted' } })
    @ApiUnauthorizedResponse()
    async deleteModel(@Param('modelId') modelId: string) {
        this.logger.emit({
            severityNumber: SeverityNumber.TRACE,
            severityText: 'trace',
            body: ``,
            attributes: { route: `/api/models/${modelId}`, method: 'DELETE', timestamp: new Date().toISOString() },
        });
        return await this.modelsService.deleteModel(modelId);
    }
}
