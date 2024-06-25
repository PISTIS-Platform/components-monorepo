import { Body, Controller, Param, Post } from '@nestjs/common';
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
}
