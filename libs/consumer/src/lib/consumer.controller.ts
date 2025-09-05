import { InjectQueue } from '@nestjs/bull';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CONNECTOR_QUEUE } from '@pistis/bullMq';
import { AuthToken, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { Queue } from 'bullmq';
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
    constructor(
        private readonly consumerService: ConsumerService,
        @InjectQueue(CONNECTOR_QUEUE) private connectorQueue: Queue,
    ) {}

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
        const metadata = await this.consumerService.retrieveMetadata(assetId);
        const format = metadata.distributions
            .map(({ format }: any) => format?.id ?? null)
            .filter((id: any) => id !== null)[0];
        await this.connectorQueue.add(
            'retrieveData',
            { assetId, user, token, data, format },
            { attempts: 3, removeOnComplete: true },
        );

        //TODO discuss how we want to check more conditions for investment etc
        if (metadata.monetization[0].purchase_offer[0].type === 'subscription') {
            await this.connectorQueue.upsertJobScheduler(
                'retrieveScheduledData',
                {
                    pattern: '0 0 * * 1', // Runs every Monday at midnight (cron schedule)
                    endDate: undefined, // Add the termionation date for data retrieval
                },
                {
                    name: `scheduled-retrieval-sync-for-${assetId}`,
                    data: { assetId, user, token, data },
                },
            );
        } else if (metadata.monetization[0].purchase_offer[0].type === 'kafka-streaming') {
            const target = await this.consumerService.getAssetId(assetId);
            await this.connectorQueue.upsertJobScheduler(
                'deleteStreamingConnector',
                {
                    endDate: undefined, // Add the termionation date for data retrieval
                },
                {
                    name: `streaming-connector-removal-for-${assetId}`,
                    data: { assetId, target },
                },
            );
        }
        return {
            message: 'Data retrieval ok',
        };
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
    async getFactoryConnectionDetails() {
        return this.consumerService.getFactoryConnectionDetails();
    }
}
