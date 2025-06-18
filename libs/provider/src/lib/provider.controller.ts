import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthToken } from '@pistis/shared';

import { PaginationDto } from './dto/pagination.dto';
import { StreamingDataDto } from './dto/streaming-data.dto';
import { ProviderService } from './provider.service';

@Controller('provider')
@ApiTags('provider')
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
export class ProviderController {
    constructor(private readonly providerService: ProviderService) {}

    @Post('streaming')
    @ApiOkResponse({
        description: 'Streaming data',
        schema: {
            example: {
                id: 'streaming-id',
                title: 'Streaming Title',
                description: 'Streaming Description',
            },
        },
    })
    @ApiBody({ type: StreamingDataDto })
    async createStreamingData(@Body() streamingData: StreamingDataDto, @AuthToken() token: string) {
        return await this.providerService.createStreamingMetadata(token, streamingData);
    }

    @Post(':assetId')
    @ApiOkResponse({
        description: 'Download dataset',
        schema: {
            example: {
                data: [[1, 35, 'Bob']],
                metadata: [{}],
                data_model: {
                    columns: [
                        {
                            name: 'id',
                            dataType: 'Integer',
                        },
                        {
                            name: 'age',
                            dataType: 'Integer',
                        },
                        {
                            name: 'name',
                            dataType: 'String',
                        },
                    ],
                },
            },
        },
    })
    @ApiBody({ type: PaginationDto })
    async downloadDataset(
        @Param('assetId') assetId: string,
        @Body() paginationData: PaginationDto,
        @AuthToken() token: string,
    ) {
        return await this.providerService.downloadDataset(assetId, paginationData, token);
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
        return this.providerService.getFactoryConnectionDetails(token);
    }
}
