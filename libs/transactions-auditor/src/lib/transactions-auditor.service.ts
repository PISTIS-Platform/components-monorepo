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

    async retrieveAll(query: PaginateQuery): Promise<Record<string, any>> {
        // Parse pagination
        const page = query.currentPage || 1;
        const limit = query.itemsPerPage || 10;
        const offset = query.offset || 0;

        // Parse sorting - sortBy is an array with objects
        let orderBy: any = { createdAt: 'DESC' }; // default sort

        if (query.sortBy && Array.isArray(query.sortBy) && query.sortBy.length > 0) {
            const sortObj = query.sortBy[0];

            // The object should have property and direction
            if (sortObj && typeof sortObj === 'object') {
                const property = (sortObj as any).property;
                const direction = (sortObj as any).direction;

                if (property && direction) {
                    orderBy = { [property]: direction.toUpperCase() };
                }
            }
        }

        // Get total count
        const totalItems = await this.repo.count();

        // Get paginated results
        const data = await this.repo.findAll({
            orderBy: orderBy,
            limit: limit,
            offset: offset,
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        // Build response in PaginateResponse format
        return {
            data: data as any,
            meta: {
                totalItems,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
            links: {
                first: `${query.url?.pathname}?page=1&limit=${limit}`,
                previous: hasPreviousPage ? `${query.url?.pathname}?page=${page - 1}&limit=${limit}` : undefined,
                current: `${query.url?.pathname}?page=${page}&limit=${limit}`,
                next: hasNextPage ? `${query.url?.pathname}?page=${page + 1}&limit=${limit}` : undefined,
                last: `${query.url?.pathname}?page=${totalPages}&limit=${limit}`,
            },
        };
    }

    async retrieveByFactory(query: PaginateQuery, user: UserInfo): Promise<Record<string, any>> {
        // Parse pagination
        const page = query.currentPage || 1;
        const limit = query.itemsPerPage || 10;
        const offset = query.offset || 0;

        // Parse sorting - sortBy is an array with objects
        let orderBy: any = { createdAt: 'DESC' }; // default sort

        if (query.sortBy && Array.isArray(query.sortBy) && query.sortBy.length > 0) {
            const sortObj = query.sortBy[0];

            // The object should have property and direction
            if (sortObj && typeof sortObj === 'object') {
                const property = (sortObj as any).property;
                const direction = (sortObj as any).direction;

                if (property && direction) {
                    orderBy = { [property]: direction.toUpperCase() };
                }
            }
        }

        // Calculate date range for last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Build where clause
        const whereClause = {
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
        };

        // Get total count
        const totalItems = await this.repo.count(whereClause);

        // Get paginated results
        const data = await this.repo.findAll({
            where: whereClause,
            orderBy: orderBy,
            limit: limit,
            offset: offset,
            fields: [
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
            ] as any,
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        // Build response in PaginateResponse format
        return {
            data: data as any,
            meta: {
                totalItems,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
            links: {
                first: `${query.url?.pathname}?page=1&limit=${limit}`,
                previous: hasPreviousPage ? `${query.url?.pathname}?page=${page - 1}&limit=${limit}` : undefined,
                current: `${query.url?.pathname}?page=${page}&limit=${limit}`,
                next: hasNextPage ? `${query.url?.pathname}?page=${page + 1}&limit=${limit}` : undefined,
                last: `${query.url?.pathname}?page=${totalPages}&limit=${limit}`,
            },
        };
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
