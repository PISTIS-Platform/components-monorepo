import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ConsumerService } from './consumer.service';

@Controller('consumer')
@ApiTags('consumer')
export class ConsumerController {
    constructor(private readonly consumerService: ConsumerService) {}

    @Get('/retrieve/:contractId/:assetId')
    async retrieveData(@Param('contractId') contractId: string, @Param('assetId') assetId: string, user: any) {
        //FIXME: change types in variables when we have actual results
        return await this.consumerService.retrieveData(contractId, assetId, user, 'token');
    }
}
