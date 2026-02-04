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

import { QuerySelectorDTO } from './dto';
import { ConfigDataDto } from './dto/configurationData.dto';
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
    async createStreamingData(@Body() streamingData: StreamingDataDto) {
        return await this.providerService.createStreamingMetadata(streamingData);
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
    @ApiBody({ type: StreamingDataDto })
    async downloadDataset(
        @Param('assetId') assetId: string,
        @Body() configurationData: ConfigDataDto,
        @AuthToken() token: string,
    ) {
        return await this.providerService.downloadDataset(assetId, configurationData, token);
    }

    @Get('/kafka/:assetId')
    @ApiOkResponse({
        description: 'Retrieve connection details for kafka',
        schema: {
            example: {
                url: 'develop.pistis-market.eu:9094',
                topic: 'ds-ec221eea-fcc6-4e74-8f4d-4ccd5206c5e0',
            },
        },
    })
    async getTopicDetails(@Param('assetId') assetId: string) {
        return this.providerService.getTopicDetails(assetId);
    }

    @Post('/query-selector')
    @ApiOkResponse({
        description: 'Consumer response',
        schema: { example: { asset_uuid: 'ae755a90-b7bc-4c28-bfc8-7a4fb247328b', message: 'Table created' } },
    })
    async querySelector(@Body() data: QuerySelectorDTO) {
        return await this.providerService.querySelectorCreate(data);
    }
}
