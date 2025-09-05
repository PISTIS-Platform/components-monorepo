import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthToken } from '@pistis/shared';

import { ConfigDataDto } from './dto/configurationData.dto';
import { StreamingDataDto } from './dto/streaming-data.dto';
import { ProviderService } from './provider.service';

@Controller('provider')
@ApiTags('provider')
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
    async createStreamingData(
        @Body() streamingData: StreamingDataDto,
        // , @AuthToken() token: string
    ) {
        return await this.providerService.createStreamingMetadata('token', streamingData);
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
}
