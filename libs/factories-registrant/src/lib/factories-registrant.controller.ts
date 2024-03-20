import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLE, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';

import { CreateFactoryDTO } from './dto/create-factory.dto';
import { UpdateFactoryDTO } from './dto/update-factory.dto';
import { FactoriesRegistrant } from './factories-registrant.entity';
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
    ): Promise<FactoriesRegistrant> {
        return this.factoriesService.createFactory(data, user.id);
    }

    @Patch(':factoryId/accept')
    @Roles({ roles: [ADMIN_ROLE] })
    async acceptFactory(@Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string) {
        return this.factoriesService.acceptFactory(factoryId, true);
    }

    @Patch(':factoryId/deny')
    @Roles({ roles: [ADMIN_ROLE] })
    async denyFactory(@Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string) {
        return this.factoriesService.acceptFactory(factoryId, false);
    }
}
