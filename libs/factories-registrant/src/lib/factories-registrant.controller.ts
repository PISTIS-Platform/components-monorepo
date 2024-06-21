import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
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
export class FactoriesRegistrantController {
    constructor(
        private readonly factoriesService: FactoriesRegistrantService,
        private readonly servicesMappingService: ServicesMappingService,
    ) {}

    @Get()
    @Roles({ roles: [ADMIN_ROLE] })
    async findFactories(): Promise<FactoriesRegistrant[]> {
        return this.factoriesService.retrieveFactories();
    }

    @Get('list')
    async findAcceptedFactories() {
        return this.factoriesService.retrieveAcceptedFactories();
    }

    @Get('services-mapping')
    async findServicesMappingForGeneralUsers() {
        return this.servicesMappingService.findServicesMappingForGeneralUsers();
    }

    @Get('services')
    @Roles({ roles: [ADMIN_ROLE] })
    async findServicesMappingForAdmin() {
        return this.servicesMappingService.findServicesMappingForAdmin();
    }

    @Get('services/:id')
    @Roles({ roles: [ADMIN_ROLE] })
    async findServiceMapping(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.servicesMappingService.find(id);
    }

    @Post('services')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiBody({ type: CreateServiceMappingDTO })
    async createServiceMapping(@Body() data: CreateServiceMappingDTO) {
        return await this.servicesMappingService.create(data);
    }

    @Patch('services/:id')
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiBody({ type: UpdateServiceMappingDTO })
    async updateServiceMapping(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() data: UpdateServiceMappingDTO,
    ) {
        return await this.servicesMappingService.update(id, data);
    }

    @Get(':organizationId/services')
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
    async findFactoryInfo(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.retrieveFactory(factoryId);
    }

    @Put('set-ip')
    async setFactoryIp(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Body() data: UpdateFactoryIpDTO,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.setFactoryIp(data, user.organizationId);
    }

    @Put(':factoryId/update')
    @Roles({ roles: [ADMIN_ROLE] })
    async updateFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @AuthToken() token: string,
        @Body() data: UpdateFactoryDTO,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.updateFactory(data, token, factoryId, user.id);
    }

    @Post()
    @Roles({ roles: [ADMIN_ROLE] })
    async createFactory(
        @AuthToken() token: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Body() data: CreateFactoryDTO,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.createFactory(data, token);
    }

    @Patch(':factoryId/activate')
    @Roles({ roles: [ADMIN_ROLE] })
    async activateFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @AuthToken() token: string,
    ) {
        return this.factoriesService.activateFactory(factoryId, token, user.id);
    }

    @Patch(':factoryId/suspend')
    @Roles({ roles: [ADMIN_ROLE] })
    async suspendFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @AuthToken() token: string,
    ) {
        return this.factoriesService.suspendFactory(factoryId, token, user.id);
    }
}
