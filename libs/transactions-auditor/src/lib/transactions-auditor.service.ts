import { PageFactory, PaginateQuery, PaginateResponse } from '@emulienfou/nestjs-mikro-orm-paginate';
import { InjectRepository } from '@mikro-orm/nestjs';
import { SqlEntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { TransactionAuditorDTO } from './dto';
import { TransactionsAuditor } from './transactions-auditor.entity';

@Injectable()
export class TransactionsAuditorService {
    constructor(
        @InjectRepository(TransactionsAuditor) private readonly repo: SqlEntityRepository<TransactionsAuditor>,
    ) {}

    async create(data: TransactionAuditorDTO): Promise<TransactionsAuditor> {
        const entity = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(entity);
        return entity;
    }

    async retrieveAll(query: PaginateQuery): Promise<PaginateResponse<TransactionAuditorDTO>> {
        return new PageFactory(query, this.repo).create();
    }
}
