import { Paginate, PaginateQuery } from '@emulienfou/nestjs-mikro-orm-paginate';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLE } from '@pistis/shared';
import { Roles } from 'nest-keycloak-connect';

import { TransactionAuditorDTO } from './dto';
import { TransactionsAuditorService } from './transactions-auditor.service';

@Controller('transations-auditor')
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
    async retrieveAll(@Paginate() query: PaginateQuery) {
        return this.service.retrieveAll(query);
    }
}
