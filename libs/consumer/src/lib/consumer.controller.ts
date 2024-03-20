import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser } from 'nest-keycloak-connect';

import { ConsumerService } from './consumer.service';

@Controller('consumer')
@ApiTags('consumer')
@ApiBearerAuth()
export class ConsumerController {
    constructor(private readonly consumerService: ConsumerService) {}

    @Get('/retrieve/:contractId/:assetId')
    async retrieveData(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('contractId') contractId: string,
        @Param('assetId') assetId: string,
    ) {
        //FIXME: change types in variables when we have actual results
        return await this.consumerService.retrieveData(contractId, assetId, user.id, 'token');
    }
}
