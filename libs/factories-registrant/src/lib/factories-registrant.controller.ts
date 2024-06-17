import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLE, AuthToken, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';
import { join } from 'path';

import { CreateFactoryDTO } from './dto/create-factory.dto';
import { UpdateFactoryDTO } from './dto/update-factory.dto';
import { FactoriesRegistrant } from './entities/factories-registrant.entity';
import { FactoriesRegistrantService } from './factories-registrant.service';

@Controller('factories')
@ApiTags('factories-registrant')
@ApiBearerAuth()
export class FactoriesRegistrantController {
    constructor(private readonly factoriesService: FactoriesRegistrantService) {}

    @Get()
    @Roles({ roles: [ADMIN_ROLE] })
    async findFactories(): Promise<FactoriesRegistrant[]> {
        return this.factoriesService.retrieveFactories();
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
    async downloadKeycloakClients(@Res({ passthrough: true }) res: Response) {
        const clients = await this.factoriesService.checkClient(''); //FIXME: change empty string with actual organization id when we have the information

        // Set appropriate headers to indicate JSON content
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=keycloak-clients.json');

        // Send JSON object as response
        res.send(JSON.stringify(clients));
    }

    @Get(':factoryId')
    async findFactoryInfo(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.retrieveFactory(factoryId);
    }

    @Put(':factoryId')
    @Roles({ roles: [ADMIN_ROLE] })
    async updateFactoryStatus(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @Body() data: UpdateFactoryDTO,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.updateFactoryStatus(factoryId, data);
    }

    @Post()
    async createFactory(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Body() data: CreateFactoryDTO,
        @AuthToken() token: string,
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.createFactory(data, user.id, token);
    }

    @Patch(':factoryId/accept')
    @Roles({ roles: [ADMIN_ROLE] })
    async acceptFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthToken() token: string,
    ) {
        return this.factoriesService.acceptFactory(factoryId, true, token);
    }

    @Patch(':factoryId/deny')
    @Roles({ roles: [ADMIN_ROLE] })
    async denyFactory(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @AuthToken() token: string,
    ) {
        return this.factoriesService.acceptFactory(factoryId, false, token);
    }
}
