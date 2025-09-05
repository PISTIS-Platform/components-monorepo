import { InjectQueue } from '@nestjs/bull';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CONNECTOR_QUEUE } from '@pistis/bullMq';
import { AuthToken, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { Queue } from 'bullmq';
import dayjs from 'dayjs';
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
        const frequency = metadata.monetization[0].purchase_offer[0].update_frequency;
        let updatePattern = '';

        if (frequency === 'hourly') {
            updatePattern = '0 * * * *'; // Runs at the top of every hour
        } else if (frequency === 'daily') {
            updatePattern = '0 0 * * *'; // Runs every day at midnight
        } else if (frequency === 'weekly') {
            updatePattern = '0 0 * * 1'; // Runs every Monday at midnight
        } else if (frequency === 'monthly') {
            updatePattern = '0 0 1 * *'; // Runs on the first day of every month at midnight
        }
        const format = metadata.distributions
            .map(({ format }: any) => format?.id ?? null)
            .filter((id: any) => id !== null)[0];
        await this.connectorQueue.add(
            'retrieveData',
            { assetId, user, token, data, format },
            { attempts: 3, removeOnComplete: true },
        );

        if (metadata.monetization[0].purchase_offer[0].type === 'subscription') {
            await this.connectorQueue.upsertJobScheduler(
                'retrieveScheduledData',
                {
                    pattern: updatePattern,
                    endDate: dayjs(metadata.monetization[0].purchase_offer[0].term_date),
                },
                {
                    name: `scheduled-retrieval-sync-for-${assetId}`,
                    data: { assetId, user, token, data },
                },
            );
        }
        if (metadata.distributions[0].title.en === 'Kafka Stream') {
            const target = await this.consumerService.getAssetId(assetId);
            await this.connectorQueue.upsertJobScheduler(
                'deleteStreamingConnector',
                {
                    endDate: dayjs(metadata.monetization[0].purchase_offer[0].term_date),
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
