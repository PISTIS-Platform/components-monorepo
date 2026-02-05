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
        query.filter = {};

        // calculate date range for last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        return new PageFactory(query, this.repo, {
            // Explicitly select fields
            select: [
                'id',
                'transactionId',
                'transactionFee',
                'amount',
                // 'factoryBuyerId',
                'factoryBuyerName',
                // 'factorySellerId',
                'factorySellerName',
                'assetId',
                'assetName',
                'createdAt',
                // 'updatedAt',
                'terms',
            ],
            where: {
                $and: [
                    {
                        $or: [{ factoryBuyerId: user.organizationId }, { factorySellerId: user.organizationId }],
                    },
                    {
                        createdAt: {
                            $gte: thirtyDaysAgo,
                        },
                    },
                ],
            },
        }).create();
    }

    async getSumsByFactory(user: UserInfo) {
        // Calculate date range for last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const em = this.repo.getEntityManager();

        const expensesResult = await em.getConnection().execute(
            `SELECT COALESCE(SUM(amount), 0) as total 
         FROM "transactionsAuditor"
         WHERE factory_buyer_id = ? AND created_at >= ?`,
            [user.organizationId, thirtyDaysAgo],
        );

        const incomeResult = await em.getConnection().execute(
            `SELECT COALESCE(SUM(amount), 0) as total 
         FROM "transactionsAuditor" 
         WHERE factory_seller_id = ? AND created_at >= ?`,
            [user.organizationId, thirtyDaysAgo],
        );

        return {
            expensesTotal: Number(expensesResult[0]['total']),
            incomeTotal: Number(incomeResult[0]['total']),
        };
    }

    async findByUserAndAssetId(userId: string, assetId: string): Promise<TransactionsAuditor | null> {
        return await this.repo.findOne({ factoryBuyerId: userId, assetId });
    }
}
