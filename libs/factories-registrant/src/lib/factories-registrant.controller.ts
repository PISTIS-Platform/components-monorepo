import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Res, StreamableFile } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ADMIN_ROLE, AuthToken, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';
import { join } from 'path';
import YAML from 'yaml';

import { UpdateFactoryDTO, UpdateFactoryIpDTO } from './dto';
import { CreateFactoryDTO } from './dto/create-factory.dto';
import { CreateServiceMappingDTO } from './dto/create-service-mapping.dto';
import { UpdateServiceMappingDTO } from './dto/update-service-mapping.dto';
import { FactoriesRegistrant } from './entities/factories-registrant.entity';
import { FactoriesRegistrantService } from './factories-registrant.service';
import { ServicesMappingService } from './services-mapping.service';

@Controller('factories')
@ApiTags('factories-registrant')
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
export class FactoriesRegistrantController {
    constructor(
        private readonly factoriesService: FactoriesRegistrantService,
        private readonly servicesMappingService: ServicesMappingService,
    ) {}

    @Get()
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({
        description: 'Factories',
        schema: {
            example: [
                {
                    id: '768004e7-33b1-4248-bafe-04688f49f161',
                    organizationName: 'TestOrg',
                    organizationId: '8aff8e9b-1322-4395-a53e-c445d159eb80',
                    ip: '192.168.1.1',
                    country: 'Greece',
                    status: 'live',
                    isAccepted: false,
                    isActive: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        },
    })
    async findFactories(): Promise<FactoriesRegistrant[]> {
        return this.factoriesService.retrieveFactories();
    }

    @Get('list')
    @ApiOkResponse({
        description: 'Accepted Factory',
        schema: {
            example: [
                {
                    id: '768004e7-33b1-4248-bafe-04688f49f161',
                    organizationName: 'TestOrg',
                    organizationId: '8aff8e9b-1322-4395-a53e-c445d159eb80',
                    ip: '192.168.1.1',
                    country: 'Greece',
                    status: 'live',
                    isAccepted: true,
                    isActive: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        },
    })
    async findAcceptedFactories() {
        return this.factoriesService.retrieveAcceptedFactories();
    }

    @Get('services-mapping')
    @ApiOkResponse({
        description: 'Services mapping',
        schema: {
            example: {
                serviceName: 'serviceUrl',
                'Test Service': 'Test-Url',
            },
        },
    })
    async findServicesMappingForGeneralUsers() {
        return this.servicesMappingService.findServicesMappingForGeneralUsers();
    }

    @Get('services')
    @ApiOkResponse({
        description: 'Services for Admin',
        schema: {
            example: [
                {
                    id: 'e13e463a-cf7f-46e2-aa64-96537dd4235d',
                    serviceName: 'Test service',
                    serviceUrl: 'TestUrl',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        },
    })
    @Roles({ roles: [ADMIN_ROLE] })
    async findServicesMappingForAdmin() {
        return this.servicesMappingService.findServicesMappingForAdmin();
    }

    @Get('services/:id')
    @ApiOkResponse({
        description: 'Find Service',
        schema: {
            example: {
                id: 'e13e463a-cf7f-46e2-aa64-96537dd4235d',
                serviceName: 'Test service',
                serviceUrl: 'TestUrl',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    @Roles({ roles: [ADMIN_ROLE] })
    async findServiceMapping(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.servicesMappingService.find(id);
    }

    @Post('services')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({
        description: 'Create Service',
        schema: {
            example: {
                id: '60fbe3de-e1de-4bb0-8480-61bb2aa00640',
                serviceName: 'Test s',
                serviceUrl: 'A1-B3/C5',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    @ApiBody({ type: CreateServiceMappingDTO })
    async createServiceMapping(@Body() data: CreateServiceMappingDTO) {
        return await this.servicesMappingService.create(data);
    }

    @Patch('services/:id')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({
        description: 'Update Service',
        schema: {
            example: {
                id: '60fbe3de-e1de-4bb0-8480-61bb2aa00640',
                serviceName: 'Test serv',
                serviceUrl: 'A1-B3/C5',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    @ApiBody({ type: UpdateServiceMappingDTO })
    async updateServiceMapping(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() data: UpdateServiceMappingDTO,
    ) {
        return await this.servicesMappingService.update(id, data);
    }

    @Get(':organizationId/services')
    @ApiOkResponse({
        description: 'Organization Services',
        schema: {
            example: {
                'Pistis market': 'https://pistis-market.pistis-market.eu/srv/A1-B2/C3',
                'S5 market': 'https://s5-market.pistis-market.eu/srv/A1-B2/C5',
            },
        },
    })
    async findOrganisationServices(
        @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string,
    ) {
        return this.servicesMappingService.findOrganizationServices(organizationId);
    }

    @Get('download-instructions')
    downloadSetUpInstructions(@Res({ passthrough: true }) res: Response): StreamableFile {
        const file = createReadStream(join(process.cwd(), '/apps/factories-registrant-component/src/assets/test.txt')); //TODO: test.txt is a dummy file we will change it when we have a first example from the actual file

        res.set({
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="test.txt"',
        });
        return new StreamableFile(file);
    }

    @Get('download-keycloak-clients')
    async downloadKeycloakClients(
        @Res({ passthrough: true }) res: Response,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ) {
        const clients = YAML.stringify(await this.factoriesService.checkClient(user.organizationId));

        // Set appropriate headers to indicate JSON content
        res.setHeader('Content-Type', 'application/yaml');
        res.setHeader('Content-Disposition', 'attachment; filename=keycloak-clients.yaml');

        // Send JSON object as response
        res.send(JSON.stringify(clients));
    }

    @Get(':factoryId')
    @ApiOkResponse({
        description: 'Factory',
        schema: {
            example: {
                id: '768004e7-33b1-4248-bafe-04688f49f161',
                organizationName: 'TestOrg',
                organizationId: '8aff8e9b-1322-4395-a53e-c445d159eb80',
                ip: '192.168.1.1',
                country: 'Greece',
                status: 'live',
                isAccepted: false,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    async findFactoryInfo(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.retrieveFactory(factoryId);
    }

    @Put('set-ip')
    @ApiOkResponse({
        description: 'Factory update',
        schema: {
            example: {
                id: '768004e7-33b1-4248-bafe-04688f49f161',
                organizationName: 'TestOrg',
                organizationId: '8aff8e9b-1322-4395-a53e-c445d159eb80',
                ip: '192.168.1.4',
                country: 'Greece',
                status: 'live',
                isAccepted: false,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    @ApiBody({ type: UpdateFactoryIpDTO })
    async setFactoryIp(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Body() data: UpdateFactoryIpDTO,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.setFactoryIp(data, user.organizationId);
    }

    @Put(':factoryId/update')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({
        description: 'Factory update',
        schema: {
            example: {
                id: '768004e7-33b1-4248-bafe-04688f49f161',
                organizationName: 'TestOrg',
                organizationId: '8aff8e9b-1322-4395-a53e-c445d159eb80',
                ip: '192.168.1.2',
                country: 'Greece',
                status: 'live',
                isAccepted: false,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    @ApiBody({ type: UpdateFactoryDTO })
    async updateFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @AuthToken() token: string,
        @Body() data: UpdateFactoryDTO,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.updateFactory(data, token, factoryId, user.id);
    }

    @Post()
    @ApiOkResponse({
        description: 'Create Factory',
        schema: {
            example: {
                id: '768004e7-33b1-4248-bafe-04688f49f161',
                organizationName: 'TestOrg',
                organizationId: '8aff8e9b-1322-4395-a53e-c445d159eb80',
                ip: '192.168.1.1',
                country: 'Greece',
                status: 'live',
                isAccepted: false,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    @ApiBody({ type: CreateFactoryDTO })
    @Roles({ roles: [ADMIN_ROLE] })
    async createFactory(@AuthToken() token: string, @Body() data: CreateFactoryDTO): Promise<FactoriesRegistrant> {
        return this.factoriesService.createFactory(data, token);
    }

    @Patch(':factoryId/activate')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({
        description: 'Factory accepted',
        schema: {
            example: { message: 'Notification created' },
        },
    })
    async activateFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @AuthToken() token: string,
    ) {
        return this.factoriesService.activateFactory(factoryId, token, user.id);
    }

    @Patch(':factoryId/suspend')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOkResponse({
        description: 'Factory suspended',
        schema: {
            example: { message: 'Notification created' },
        },
    })
    async suspendFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @AuthToken() token: string,
    ) {
        return this.factoriesService.suspendFactory(factoryId, token, user.id);
    }
}
