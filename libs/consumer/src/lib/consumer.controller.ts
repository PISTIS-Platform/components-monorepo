import { InjectQueue } from '@nestjs/bull';
import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Queue } from 'bullmq';

import { ConsumerService } from './consumer.service';
import { RetrieveDataDTO } from './retrieveData.dto';

@Controller('consumer')
@ApiTags('consumer')
// @ApiBearerAuth()
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
        @InjectQueue('default') private connectorQueue: Queue,
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
        const metadata = await this.consumerService.retrieveMetadata(assetId);
        const user = {
            id: '15e2c4d2-bbea-4119-b3ef-65494f16fa9a',
            organizationId: 'c0604304-a46e-42f9-bec9-7894f5ba73a6',
        };
        const token =
            'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ2N3hyeklfT2RQWFE1MzlWM1c4R1Q1NnZCUE5EOFdjLTR0aE9iaG1JV1FRIn0.eyJleHAiOjE3NTYzNjUzODEsImlhdCI6MTc1NjI3ODk4MiwiYXV0aF90aW1lIjoxNzU2Mjc4OTgxLCJqdGkiOiIyMGE4MDNkMC1iNTZjLTQwYTItYTdkMy1lNGIyNzFiMjk4NTYiLCJpc3MiOiJodHRwczovL2F1dGgucGlzdGlzLW1hcmtldC5ldS9yZWFsbXMvUElTVElTIiwiYXVkIjoiYWNjb3VudCIsInN1YiI6IjE1ZTJjNGQyLWJiZWEtNDExOS1iM2VmLTY1NDk0ZjE2ZmE5YSIsInR5cCI6IkJlYXJlciIsImF6cCI6ImMwNjA0MzA0LWE0NmUtNDJmOS1iZWM5LTc4OTRmNWJhNzNhNi0tNmRlZDJiYWUtNzgwZC00NDQ5LTg5YmEtZWFkY2UyZjY4YTRhIiwic2lkIjoiMzI2ZmY4MzQtMmI2Zi00MjUxLTk4ZDMtNzdiOTU3NzRhNjdmIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJQSVNUSVNfVVNFUiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iLCJkZWZhdWx0LXJvbGVzLXBpc3RpcyJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGVtYWlsIHByb2ZpbGUgcGlzdGlzIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJwaXN0aXMiOnsidXNlciI6eyJyb2xlIjpbIlBJU1RJU19VU0VSIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtcGlzdGlzIl19LCJncm91cCI6eyJjb3VudHJ5IjoiR1IiLCJzaXplIjoiU01BTEwiLCJwcmVmaXgiOiJkZXZlbG9wIiwiZG9tYWluIjoiRURVQ0FUSU9OIiwiaWQiOiJjMDYwNDMwNC1hNDZlLTQyZjktYmVjOS03ODk0ZjViYTczYTYiLCJ0eXBlIjoiUFVCTElDX0JPRFkifX0sIm5hbWUiOiJKYW5lIERvZSIsInByZWZlcnJlZF91c2VybmFtZSI6InBkdC0wMSIsImdpdmVuX25hbWUiOiJKYW5lIiwiZmFtaWx5X25hbWUiOiJEb2UiLCJlbWFpbCI6ImphbmUuZG9lQHBkdC5jb20iLCJncm91cCI6WyIvUERUIl19.GXUWKrQckD7oeElkkhyD8r5BjzzMxFxtkHRqPnF55Q5sS0z-Z5QeA6guDb2xqHWO_rkqbGDw1hTH3wRzfpPyYVAmSu5V1betOp5OLwqsHvxPWjWVkF67_VvgQbDqmhzBBvgi_NgvRTgPr2gFHYAHHTxtlNrr85jrS_kL4J6MRJxMC0NLj-hS_CTpqaCUiotPjUF_6PkA6F2E-WN5zBvowCiQ2jyeN9snwhtssOqx9iPePSv2lR5h-j6-G81uf5ZndgHJ0xsx4kCfS8SNNJcacbRtRKMYvuOnaQkGvz9ZJe-BbqVbagQC8AbgnsS9WIJQdQqRC8uMlsqH915-zz2bp3fYd4U3I_eEwzIzYwPe6eg6eppY86jubMBgnhgzCXVV8tAlqA5u6ZVFsEFoQdQzBfXnRx-l-Vwmwa30KxXtj-qF1dtbj9ESnZF2B22UinZG6vBGmQp1zHGBOSa2lllmlAd2Rn7a89WuALnySflHIOjH3MOJFKSTpQkSelSbkPAmivoQPc15GmnV2onhqtemnONlam40NWaxnTJC5pFvsQufxwoz68nB4ZXCWtJU6ghxR2sSZj4trzBt7kCZlErOsvpEs8d-xTcPGsvlhLmE1gV4QE-d_Bn7CUAHoUSVtB53Cq35SdtEA58CAQNHMmUJwuarTqpfZJRMh-GQFP-ZslU';
        await this.connectorQueue.add(
            'retrieveData',
            { assetId, user, token, data },
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
        }
        return {
            message: 'Data retrieval ok',
        };
    }
}
