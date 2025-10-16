import { PageFactory, PaginateQuery, PaginateResponse } from '@emulienfou/nestjs-mikro-orm-paginate';
import { InjectRepository } from '@mikro-orm/nestjs';
import { SqlEntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { TransactionAuditorDTO } from './dto';
import { TransactionsAuditor } from './transactions-auditor.entity';
import { UserInfo } from '@pistis/shared';

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

    async retrieveByFactory(query: PaginateQuery, user: UserInfo): Promise<PaginateResponse<TransactionAuditorDTO>> {

        const qb = this.repo.createQueryBuilder();

        // whitelist of fields users are allowed to filter on, for now only assetName
        const allowedFilterFields = ['assetName'];

        // sanitize the filter to only include allowed fields
        const sanitizedFilter: any = {};
        if (query.filter && typeof query.filter === 'object') {
            for (const key of allowedFilterFields) {
                if (key in query.filter) {
                    const value = query.filter[key];
                }
            }
        }

        // build the secure query
        const conditions: any[] = [
            {
                $or: [{ factoryBuyerId: user.organizationId }, { factorySellerId: user.organizationId }],
            },
        ];

        if (Object.keys(sanitizedFilter).length > 0) {
            conditions.push(sanitizedFilter);
        }

        qb.where({ $and: conditions });

        return new PageFactory(query, qb).create();
    }

    async findByUserAndAssetId(userId: string, assetId: string): Promise<TransactionsAuditor | null> {
        return await this.repo.findOne({ factoryBuyerId: userId, assetId });
    }
}
