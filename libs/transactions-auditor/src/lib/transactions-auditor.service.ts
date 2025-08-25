import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';

import { TransactionAuditorDTO } from './dto';
import { TransactionsAuditor } from './transactions-auditor.entity';

@Injectable()
export class TransactionsAuditorService {
    constructor(@InjectRepository(TransactionsAuditor) private readonly repo: EntityRepository<TransactionsAuditor>) {}

    async create(data: TransactionAuditorDTO) {
        const entity = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(entity);
        return entity;
    }
}
