import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { getHeaders, UserInfo } from '@pistis/shared';
import dayjs from 'dayjs';
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
        private readonly metadataRepositoryService: MetadataRepositoryService,
    ) {}

    private async retrieveToken() {
        const tokenData = {
            grant_type: 'client_credentials',
            client_id: this.options.clientId,
            client_secret: this.options.secret,
        };
        return await firstValueFrom(
            this.httpService
                .post(
                    `${this.options.authServerUrl}/realms/${this.options.realm}/protocol/openid-connect/token`,
                    tokenData,
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    },
                )
                .pipe(
                    map(({ data }) => {
                        return data.access_token;
                    }),
                    catchError((error) => {
                        this.logger.error('Error occurred during token retrieval: ', error);
                        return throwError(() => new BadRequestException('Error occurred during token retrieval'));
                    }),
                ),
        );
    }

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

    async updateInvestmentPlan(id: string, data: any, user: any, token: string) {
        const numberOfShares = data.numberOfShares;
        if (!Number.isInteger(numberOfShares) || numberOfShares <= 0) {
            throw new BadRequestException('numberOfShares must be a positive integer');
        }

        // Factory lookup happen before the transaction (no rollback needed,
        // and we avoid holding the DB transaction open across network calls we don't roll back).
        const factory = await this.retrieveFactory(token, user.organizationId);

        return await this.repo.getEntityManager().transactional(async (em) => {
            const investmentPlan = await em.findOneOrFail(InvestmentPlanner, { id });

            if (investmentPlan.status !== true) {
                throw new BadRequestException('Investment plan is not active');
            }
            if (dayjs(investmentPlan.dueDate).isBefore(dayjs().startOf('day'))) {
                throw new BadRequestException('Investment plan has expired');
            }

            const remainingShares = investmentPlan.remainingShares ?? investmentPlan.totalShares;
            if (numberOfShares > remainingShares) {
                throw new BadRequestException('Requested shares exceed the remaining available shares');
            }
            if (numberOfShares > investmentPlan.maxShares) {
                throw new BadRequestException('Requested shares exceed the maximum allowed per investor');
            }

            const existingInvestment = await em.findOne(UserInvestment, {
                cloudAssetId: investmentPlan.cloudAssetId,
                userId: user.id,
            });
            if (existingInvestment) {
                throw new BadRequestException('User already has an investment plan for this asset');
            }

            investmentPlan.remainingShares = remainingShares - numberOfShares;
            em.persist(investmentPlan);

            const userInvestment = em.create(UserInvestment, {
                cloudAssetId: investmentPlan.cloudAssetId,
                userId: user.id,
                shares: numberOfShares,
                investmentPlan,
            });
            em.persist(userInvestment);

            const invest = {
                assetId: investmentPlan.cloudAssetId,
                percentage: (investmentPlan.percentageOffer / investmentPlan.totalShares) * numberOfShares,
                assetFactory: user.organizationId,
                ownerId: investmentPlan.sellerId,
                price: investmentPlan.price,
            };
            // If SCEE fails, the thrown error rolls back the share decrement and the new investment.
            await this.storeInvestToScee(invest, factory.factoryPrefix, token);

            return userInvestment;
        });
    }

    private async storeInvestToScee(data: any, factoryPrefix: string, token: string) {
        return await firstValueFrom(
            this.httpService
                .post(
                    `https://${factoryPrefix}.pistis-market.eu/srv/smart-contract-execution-engine/api/scee/StoreInvestmentPlanInvestor`,
                    {
                        ...data,
                    },
                    {
                        headers: getHeaders(token),
                    },
                )
                .pipe(
                    tap((response) => this.logger.debug(response)),
                    map(() => of({ message: `SCEE create investment for assetId: ${data.assetId}` })),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Error occurred during SCEE create investment: ', error);
                        return throwError(
                            () => new BadRequestException('Error occurred during SCEE create investment'),
                        );
                    }),
                ),
        );
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

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async deactivateInvestmentPlan() {
        const now = dayjs().startOf('day').toDate();
        try {
            const investments = await this.repo.find({
                status: true,
                dueDate: { $lte: now },
            });
            for (let i = 0; i < investments.length; i++) {
                const investment = investments[i];

                investment.status = false;
                await this.repo.getEntityManager().persistAndFlush(investment);
                const orgId = await this.metadataRepositoryService.updateInvestmentPlanMetadata(
                    investment.cloudAssetId,
                );
                const token = (await this.retrieveToken()) as string;
                await this.informSCEEForFinalization(investment.assetId, orgId, token);

                this.logger.log(`Investment plan with id ${investment.id} has been deactivated`);
            }
        } catch (error) {
            this.logger.error(`Error during deactivation of investment plans: ${error}`);
        }
    }

    private async informSCEEForFinalization(assetId: string, orgId: string, token: string) {
        const factory = await this.retrieveFactory(token, orgId);
        return await firstValueFrom(
            this.httpService
                .post(
                    `https://${factory.factoryPrefix}.pistis-market.eu/srv/smart-contract-execution-engine/api/scee/FinalizeInvestmentPlanSale`,
                    {
                        assetId: assetId,
                    },
                    {
                        headers: getHeaders(token),
                    },
                )
                .pipe(
                    tap((response) => this.logger.debug(response)),
                    map(() => of({ message: `SCEE updated for investment finalization for assetId: ${assetId}` })),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Error occurred during SCEE investment finalization: ', error);
                        return throwError(
                            () => new BadRequestException('Error occurred during SCEE investment finalization'),
                        );
                    }),
                ),
        );
    }

    private async retrieveFactory(token: string, factoryId: string) {
        return await firstValueFrom(
            this.httpService
                .get(`${this.options.factoryRegistryUrl}/api/factories/organization/${factoryId}`, {
                    headers: getHeaders(token),
                })
                .pipe(
                    map((res) => res.data),
                    catchError((error) => {
                        this.logger.error('Factory retrieval error:', error);
                        return throwError(() => new BadRequestException('Error occurred during retrieving factory'));
                    }),
                ),
        );
    }

    //TODO: check if we want notifications for this component
    // private readonly createNotification = async (message: string, assetId: string, user: UserInfo) => {
    //     const notification = {
    //         userId: user.id,
    //         organizationId: user.organizationId,
    //         type: 'asset_retrieved',
    //         message: 'Asset retrieval finished',
    //     };
    //     const tokenData = {
    //         grant_type: 'client_credentials',
    //         client_id: this.options.clientId,
    //         client_secret: this.options.secret,
    //     };
    //     return await firstValueFrom(
    //         this.httpService
    //             .post(`${this.options.authServerUrl}/realms/PISTIS/protocol/openid-connect/token`, tokenData, {
    //                 headers: {
    //                     'Content-Type': 'application/x-www-form-urlencoded',
    //                 },
    //                 data: JSON.stringify(tokenData),
    //             })
    //             .pipe(
    //                 map(({ data }) => data.access_token),
    //                 map((access_token) =>
    //                     this.httpService
    //                         .post(
    //                             `${this.options.notificationsUrl}/srv/notifications/api/notifications`,
    //                             notification,
    //                             {
    //                                 headers: getHeaders(access_token),
    //                             },
    //                         )
    //                         .subscribe((value) => value),
    //                 ),
    //                 tap((response) => this.logger.debug(response)),
    //                 map(() => of({ message: 'Notification created' })),
    //                 // Catch any error occurred during the notification creation
    //                 catchError((error) => {
    //                     this.logger.error('Error occurred during notification creation: ', error);
    //                     return throwError(() => new BadRequestException('Error occurred during notification creation'));
    //                 }),
    //             ),
    //     );
    // };
}
