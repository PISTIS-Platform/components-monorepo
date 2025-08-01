import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthToken, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser } from 'nest-keycloak-connect';

import { ConsumerService } from './consumer.service';
import { RetrieveDataDTO } from './retrieveData.dto';

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

    @Post('/retrieve/:assetId')
    @ApiOkResponse({
        description: 'Consumer response',
        schema: { example: { asset_uuid: 'ae755a90-b7bc-4c28-bfc8-7a4fb247328b', message: 'Table created' } },
    })
    async retrieveData(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('assetId') assetId: string,
        @Body() data: RetrieveDataDTO,
        @AuthToken() token: string,
    ) {
        return await this.consumerService.retrieveData(assetId, user, token, data);
    }

    @Post('kafka-user/:assetId')
    @ApiOkResponse({
        description: 'Create Kafka user',
        schema: {
            example: {
                username: 'kafka-user',
                password: 'secure-password',
            },
        },
    })
    async createKafkaUser(@Param('assetId') assetId: string) {
        return await this.consumerService.createKafkaUserAndTopic(assetId);
    }

    @Get()
    @ApiOkResponse({
        description: 'Retrieve connection details for kafka',
        schema: {
            example: {
                username: 'develop',
                password: 'Test password',
                bootstrapServers: 'kafka:9092',
                securityProtocol: 'SASL_SSL',
                saslMechanism: 'SCRAM-SHA-512',
            },
        },
    })
    async getFactoryConnectionDetails(@AuthToken() token: string) {
        return this.consumerService.getFactoryConnectionDetails(token);
    }
}
