import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
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
    private readonly logger = new Logger(ConsumerController.name);
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
        const termDate = metadata.monetization[0].purchase_offer[0].term_date;
        const endDate = termDate ? new Date(termDate) : undefined;

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
                    endDate: endDate,
                },
                {
                    name: `scheduled-retrieval-sync-for-${assetId}`,
                    data: { assetId, user, token, data },
                },
            );
        }
        if (metadata.distributions.length && metadata.distributions[0].title.en === 'Kafka Stream') {
            const target = await this.consumerService.getAssetId(assetId);
            const delayUntilEndDate = endDate ? endDate.getTime() - new Date().getTime() : 0;

            await this.connectorQueue.add(
                'deleteStreamingConnector',
                { assetId, target, user },
                {
                    jobId: `streaming-connector-removal-for-${assetId}`,
                    delay: delayUntilEndDate,
                    removeOnComplete: true,
                },
            );
        }
        return {
            message: 'Data retrieval ok',
        };
    }

    @Get('/kafka/:assetId')
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
        return await this.consumerService.retrieveKafkaUserAndTopic(assetId);
    }

    @Post('subscription/:assetId')
    @ApiOkResponse({
        description: 'Stop data transfer for failed payment',
        schema: {
            example: {
                message: 'Data transfer stopped',
            },
        },
    })
    async removeQueue(@Param('assetId') assetId: string) {
        const asset = await this.consumerService.getAssetId(assetId);
        if (asset) {
            const job = await this.connectorQueue.getJob(`scheduled-retrieval-sync-for-${assetId}`);
            if (job) {
                await job.remove();
                this.logger.verbose(`Removed scheduled job for asset ${assetId}`);
            }
            return 'Data transfer stopped';
        } else {
            return 'No active data transfer found for this asset';
        }
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
