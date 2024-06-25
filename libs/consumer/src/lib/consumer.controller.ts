import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthToken, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser } from 'nest-keycloak-connect';

import { ConsumerService } from './consumer.service';

@Controller('consumer')
@ApiTags('consumer')
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
export class ConsumerController {
    constructor(private readonly consumerService: ConsumerService) {}

    @Get('/retrieve/:contractId/:assetId')
    @ApiOkResponse({
        description: 'Consumer response',
        schema: { example: { asset_uuid: 'ae755a90-b7bc-4c28-bfc8-7a4fb247328b', message: 'Table created' } },
    })
    async retrieveData(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('contractId') contractId: string,
        @Param('assetId') assetId: string,
        @AuthToken() token: string,
    ) {
        //FIXME: change types in variables when we have actual results
        return await this.consumerService.retrieveData(contractId, assetId, user.id, token);
    }
}
