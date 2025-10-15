import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders, UserInfo } from '@pistis/shared';
import { catchError, firstValueFrom, map, of, tap, throwError } from 'rxjs';

import { CreateInvestmentPlanDTO } from './create-investment-plan.dto';
import { InvestmentPlanner } from './entities/investment-planner.entity';
import { UserInvestment } from './entities/user-investment.entity';
import { INVESTMENT_PLANNER_MODULE_OPTIONS } from './investment-planner.module-definition';
import { InvestmentPlannerModuleOptions } from './investment-planner-module-options.interface';

@Injectable()
export class InvestmentPlannerService {
    private readonly logger = new Logger(InvestmentPlannerService.name);

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(InvestmentPlanner) private readonly repo: EntityRepository<InvestmentPlanner>,
        @InjectRepository(UserInvestment) private readonly userInvestmentRepo: EntityRepository<UserInvestment>,
        @Inject(INVESTMENT_PLANNER_MODULE_OPTIONS) private options: InvestmentPlannerModuleOptions,
    ) {}

    async retrieveInvestmentPlan(assetId: string) {
        return await this.repo.findOneOrFail({ cloudAssetId: assetId });
    }

    async createInvestmentPlan(data: CreateInvestmentPlanDTO, user: UserInfo) {
        const investmentPlan = this.repo.create({
            cloudAssetId: data.cloudAssetId,
            assetId: data.assetId,
            description: data.description,
            terms: data.terms,
            sellerId: user.id,
            dueDate: new Date(data.dueDate),
            percentageOffer: data.percentageOffer,
            totalShares: data.totalShares,
            remainingShares: data.totalShares, // Initialize remaining shares to total shares
            maxShares: data.maxShares,
            price: data.price,
            status: data.status,
        });
        try {
            await this.repo.getEntityManager().persistAndFlush(investmentPlan);
        } catch (error) {
            this.logger.error(`Error creating investment plan: ${error}`);
            throw new Error(`Error creating investment plan: ${error}`);
        }
        return investmentPlan;
    }

    async updateInvestmentPlan(id: string, data: any, user: UserInfo) {
        const investmentPlan = await this.repo.findOneOrFail({ id: id });
        if (investmentPlan.remainingShares === null) {
            investmentPlan.remainingShares = investmentPlan.totalShares - data.numberOfShares;
        } else {
            investmentPlan.remainingShares -= data.numberOfShares;
        }

        const userInvestment = await this.userInvestmentRepo.findOne({
            cloudAssetId: investmentPlan.cloudAssetId,
            userId: user.id,
        });
        if (userInvestment) {
            throw new BadRequestException('User already has an investment plan for this asset');
        }

        await this.repo.getEntityManager().persistAndFlush(investmentPlan);
        return await this.createUserInvestmentPlan(investmentPlan, data.numberOfShares, user.id);
    }

    private async createUserInvestmentPlan(data: any, numberOfShares: number, userId: string) {
        const userInvestment = this.userInvestmentRepo.create({
            cloudAssetId: data.cloudAssetId,
            userId: userId,
            shares: numberOfShares,
            investmentPlan: data,
        });
        try {
            await this.userInvestmentRepo.getEntityManager().persistAndFlush(userInvestment);
        } catch (error) {
            this.logger.error(`Error creating user investment plan: ${error}`);
            throw new Error(`Error creating user investment plan: ${error}`);
        }

        return userInvestment;
    }

    async getUserInvestmentPlan(assetId: string, user: UserInfo) {
        const investmentPlan = await this.repo.findOneOrFail({ id: assetId, status: true });
        return this.userInvestmentRepo.findOneOrFail({
            cloudAssetId: assetId,
            userId: user.id,
            investmentPlan: { id: investmentPlan.id, status: investmentPlan.status },
        });
    }

    async getLoggedInUserInvestmentPlans(user: UserInfo) {
        return await this.userInvestmentRepo.find({ userId: user.id }, { populate: ['investmentPlan'] });
    }

    async hasUserInvestmentPlan(assetId: string, user: UserInfo) {
        const hasInvested = await this.userInvestmentRepo.findOne({ cloudAssetId: assetId, userId: user.id });
        if (hasInvested) {
            return true;
        }
        return false;
    }

    //TODO: check if we want notifications for this component
    private readonly createNotification = async (message: string, assetId: string, user: UserInfo) => {
        const notification = {
            userId: user.id,
            organizationId: user.organizationId,
            type: 'asset_retrieved',
            message: 'Asset retrieval finished',
        };
        const tokenData = {
            grant_type: 'client_credentials',
            client_id: this.options.clientId,
            client_secret: this.options.secret,
        };
        return await firstValueFrom(
            this.httpService
                .post(`${this.options.authServerUrl}/realms/PISTIS/protocol/openid-connect/token`, tokenData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    data: JSON.stringify(tokenData),
                })
                .pipe(
                    map(({ data }) => data.access_token),
                    map((access_token) =>
                        this.httpService
                            .post(
                                `${this.options.notificationsUrl}/srv/notifications/api/notifications`,
                                notification,
                                {
                                    headers: getHeaders(access_token),
                                },
                            )
                            .subscribe((value) => value),
                    ),
                    tap((response) => this.logger.debug(response)),
                    map(() => of({ message: 'Notification created' })),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Error occurred during notification creation: ', error);
                        return throwError(() => new BadRequestException('Error occurred during notification creation'));
                    }),
                ),
        );
    };
}
