import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { TransactionAuditorDTO } from './dto';
import { TransactionsAuditorService } from './transactions-auditor.service';

@Controller('transations-auditor')
@ApiTags('transactions-auditor')
@ApiBearerAuth()
export class TransactionsAuditorController {
    constructor(private readonly service: TransactionsAuditorService) {}

    @Post()
    async create(@Body() data: TransactionAuditorDTO) {
        return this.service.create(data);
    }
}
