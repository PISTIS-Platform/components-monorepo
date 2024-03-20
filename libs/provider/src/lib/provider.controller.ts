import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PaginationDto } from './dto/pagination.dto';
import { ProviderService } from './provider.service';

@Controller('provider')
@ApiTags('provider')
@ApiBearerAuth()
export class ProviderController {
    constructor(private readonly providerService: ProviderService) {}

    @Post(':assetId')
    async downloadDataset(@Param('assetId') assetId: string, @Body() paginationData: PaginationDto) {
        return await this.providerService.downloadDataset(assetId, paginationData);
    }
}
