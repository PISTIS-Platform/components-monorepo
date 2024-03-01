import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';

import { CreateFactoryDTO } from './dto/create-factory.dto';
import { UpdateFactoryDTO } from './dto/update-factory.dto';
import { FactoriesRegistrantService } from './factories-registrant.service';

@Controller('factories')
export class FactoriesRegistrantController {
    constructor(private readonly factoriesService: FactoriesRegistrantService) {}

    @Get()
    async findFactories() {
        return this.factoriesService.retrieveFactories();
    }

    @Get(':factoryId')
    async findFactoryInfo(@Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string) {
        return this.factoriesService.retireveFactory(factoryId);
    }

    @Put(':factoryId')
    async updateFactoryStatus(
        @Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string,
        @Body() data: UpdateFactoryDTO,
    ) {
        return this.factoriesService.updateFactoryStatus(factoryId, data);
    }

    @Post()
    async createFactory(@Body() data: CreateFactoryDTO) {
        return this.factoriesService.createFactory(data);
    }

    @Patch(':factoryId/accept')
    async acceptFactory(@Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string) {
        return this.factoriesService.acceptFactory(factoryId, true);
    }

    @Patch(':factoryId/deny')
    async denyFactory(@Param('factoryId', new ParseUUIDPipe({ version: '4' })) factoryId: string) {
        return this.factoriesService.acceptFactory(factoryId, false);
    }
}
