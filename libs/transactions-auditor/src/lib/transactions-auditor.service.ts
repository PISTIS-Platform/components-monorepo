import { PageFactory, PaginateQuery, PaginateResponse } from '@emulienfou/nestjs-mikro-orm-paginate';
import { InjectRepository } from '@mikro-orm/nestjs';
import { SqlEntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { UserInfo } from '@pistis/shared';

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

    async retrieveByFactory(
        query: PaginateQuery,
        user: UserInfo,
    ): Promise<PaginateResponse<Omit<TransactionAuditorDTO, 'terms'>>> {
        const qb = this.repo.createQueryBuilder('t');
        // whitelist of fields users are allowed to filter on
        const allowedFilterFields = ['assetName'];
        // sanitize the filter to only include allowed fields
        const sanitizedFilter: Record<string, any> = {};
        if (query.filter && typeof query.filter === 'object') {
            for (const key of allowedFilterFields) {
                if (key in query.filter) {
                    sanitizedFilter[key] = query.filter[key];
                }
            }
        }

        // calculate date range for last 30 days
        const today = new Date();
        today.setHours(23, 59, 59, 999); // end of today
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0); // start of 30 days ago

        // build the secure query
        const conditions: Record<string, any>[] = [
            {
                $or: [{ factoryBuyerId: user.organizationId }, { factorySellerId: user.organizationId }],
            },
            {
                createdAt: {
                    $gte: thirtyDaysAgo,
                    $lte: today,
                },
            },
        ];
        if (Object.keys(sanitizedFilter).length > 0) {
            conditions.push(sanitizedFilter);
        }
        qb.where({ $and: conditions });

        console.log(qb._fields);

        return new PageFactory(query, qb, {
            // Explicitly select fields, so we can ignore "terms"
            select: [
                'id',
                'transactionId',
                'transactionFee',
                'amount',
                'factoryBuyerId',
                'factoryBuyerName',
                'factorySellerId',
                'factorySellerName',
                'assetId',
                'assetName',
                'createdAt',
                'updatedAt',
            ],
        }).create();
    }

    async findByUserAndAssetId(userId: string, assetId: string): Promise<TransactionsAuditor | null> {
        return await this.repo.findOne({ factoryBuyerId: userId, assetId });
    }
}
