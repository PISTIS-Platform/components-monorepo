import { ApiPaginate, Paginate, PaginateQuery } from '@emulienfou/nestjs-mikro-orm-paginate';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLE, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';

import { TransactionAuditorDTO } from './dto';
import { TransactionsAuditorService } from './transactions-auditor.service';

@Controller('transactions-auditor')
@ApiTags('transactions-auditor')
@ApiBearerAuth()
export class TransactionsAuditorController {
    constructor(private readonly service: TransactionsAuditorService) {}

    @Post()
    @ApiOperation({ summary: 'Create transaction auditor log entry' })
    async create(@Body() data: TransactionAuditorDTO) {
        return this.service.create(data);
    }

    @Get()
    @Roles({ roles: [ADMIN_ROLE] })
    @ApiOperation({ summary: 'Retrieve transactions' })
    @ApiPaginate()
    async retrieveAll(@Paginate() query: PaginateQuery) {
        return this.service.retrieveAll(query);
    }

    @Get('/transaction/factory')
    @ApiOperation({ summary: 'Retrieve transactions by factoryId' })
    @ApiPaginate()
    async retrieveByFactory(
        @Paginate() query: PaginateQuery,
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ) {
        return this.service.retrieveByFactory(query, user);
    }

    @Get('/transaction/summary')
    @ApiOperation({ summary: 'Retrieve expenses and income by factory from 30 days ago' })
    async retrieveSums(@AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo) {
        return this.service.getSumsByFactory(user);
    }

    @Get('/transaction/:userId/:assetId')
    @ApiOperation({ summary: 'Retrieve transaction by asset and user Id' })
    @ApiPaginate()
    async findByUserAndAssetId(@Param('userId') userId: string, @Param('assetId') assetId: string) {
        return this.service.findByUserAndAssetId(userId, assetId);
    }
}
