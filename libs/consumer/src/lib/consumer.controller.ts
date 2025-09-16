import { InjectQueue } from '@nestjs/bull';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CONNECTOR_QUEUE } from '@pistis/bullMq';
import { Queue } from 'bullmq';

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
        // @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('assetId') assetId: string,
        @Body() data: RetrieveDataDTO,
        // @AuthToken() token: string,
    ) {
        const user = {
            id: '15e2c4d2-bbea-4119-b3ef-65494f16fa9a',
            organisationId: 'c0604304-a46e-42f9-bec9-7894f5ba73a6',
        };
        const token =
            'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ2N3hyeklfT2RQWFE1MzlWM1c4R1Q1NnZCUE5EOFdjLTR0aE9iaG1JV1FRIn0.eyJleHAiOjE3NTc3NTc0MTYsImlhdCI6MTc1NzY3MTAxNywiYXV0aF90aW1lIjoxNzU3NjcxMDE2LCJqdGkiOiIyMDcxMzI4Ny0yMWIyLTRkZjEtOGM3My01YWE4MzA4OTU5ODYiLCJpc3MiOiJodHRwczovL2F1dGgucGlzdGlzLW1hcmtldC5ldS9yZWFsbXMvUElTVElTIiwiYXVkIjoiYWNjb3VudCIsInN1YiI6IjE1ZTJjNGQyLWJiZWEtNDExOS1iM2VmLTY1NDk0ZjE2ZmE5YSIsInR5cCI6IkJlYXJlciIsImF6cCI6ImMwNjA0MzA0LWE0NmUtNDJmOS1iZWM5LTc4OTRmNWJhNzNhNi0tNmRlZDJiYWUtNzgwZC00NDQ5LTg5YmEtZWFkY2UyZjY4YTRhIiwic2lkIjoiNWQ3MmIyMDQtODg0MS00NjA3LWIxOGEtYWFhYmRkMGI4M2ZiIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJQSVNUSVNfVVNFUiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iLCJkZWZhdWx0LXJvbGVzLXBpc3RpcyJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGVtYWlsIHByb2ZpbGUgcGlzdGlzIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJwaXN0aXMiOnsidXNlciI6eyJyb2xlIjpbIlBJU1RJU19VU0VSIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtcGlzdGlzIl19LCJncm91cCI6eyJjb3VudHJ5IjoiR1IiLCJzaXplIjoiU01BTEwiLCJwcmVmaXgiOiJkZXZlbG9wIiwiZG9tYWluIjoiRURVQ0FUSU9OIiwiaWQiOiJjMDYwNDMwNC1hNDZlLTQyZjktYmVjOS03ODk0ZjViYTczYTYiLCJ0eXBlIjoiUFVCTElDX0JPRFkifX0sIm5hbWUiOiJKYW5lIERvZSIsInByZWZlcnJlZF91c2VybmFtZSI6InBkdC0wMSIsImdpdmVuX25hbWUiOiJKYW5lIiwiZmFtaWx5X25hbWUiOiJEb2UiLCJlbWFpbCI6ImphbmUuZG9lQHBkdC5jb20iLCJncm91cCI6WyIvUERUIl19.U482Kzy54cdyazEfyKxoUi6VwgZSq39kGkbTNNi6v2bK8WVytxu0ze3lLGZYN9-GaNsukZ7GKDHXxuNqwWuEozkemLwzsWLIUvtQZ0F-1NTr2pVgH-yZJBMISOJqAHmSGkvhVTZStMLgiP7xALknNsODqv_Do9mzfgvu3zC8hgoojDIr7zhLb9_N2BOTL0VShrUwateOpm2_Hkiv8wPa2VgCz4uVQ5wZzo0D60oNqbbBrcOGRAMEXuvWb4iOlFM-Pym_QRkxrGKyD8PCGgek11XcJXZtNmd7Apx7vEukQpTmBMHtmKcCiSYPYPpEVp-a4HlaBChLTTvtX5znH5QRc61TrJPW_NnaobKq4bj9Au93HTVMMX_O3xu8PcHvvgVb_wmyiA4qdjehFaiseHNcI0nB8t87PNXX2piPncmmvgJxgPD-vvDa4Y3saitqZ_P16xL6vo84BjsshwGEee3vJOOLMzuD8HAER_Us41lPORlLh7HofTiLhw-h7KhTnm60c5PhxmYaokT0kq_xH9djoE0hcCutmOut3wIQxQqcAHXWPykspPPjyo5-NrTYb6R_CJoHClbe0IDOy2Up3rct4E6lyeEa9QbXTe6m-qVC3yQyshx1FR7gYBu0PruILRoWrqm8kK8q_FkaHj-W8lhQm3gEmIJ-sSh9JhjQ_42UFbg';
        const metadata = await this.consumerService.retrieveMetadata(assetId);
        const frequency = metadata.monetization[0].purchase_offer[0].update_frequency;
        let updatePattern = '';
        const termDate = metadata.monetization[0].purchase_offer[0].term_date;
        const endDate = termDate ? new Date(termDate) : undefined;
        console.dir(metadata, { depth: null });
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
        if (metadata.distributions.lenght && metadata.distributions[0].title.en === 'Kafka Stream') {
            const target = await this.consumerService.getAssetId(assetId);
            await this.connectorQueue.upsertJobScheduler(
                'deleteStreamingConnector',
                {
                    endDate: endDate,
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
