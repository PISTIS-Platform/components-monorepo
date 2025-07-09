import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders, UserInfo } from '@pistis/shared';
import { catchError, firstValueFrom, map, of, tap, throwError } from 'rxjs';

import { CreateInvestmentPlanDTO } from './create-investment-plan.dto';
import { InvestmentPlanner } from './investment-planner.entity';
import { INVESTMENT_PLANNER_MODULE_OPTIONS } from './investment-planner.module-definition';
import { InvestmentPlannerModuleOptions } from './investment-planner-module-options.interface';

@Injectable()
export class InvestmentPlannerService {
    private readonly logger = new Logger(InvestmentPlannerService.name);

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(InvestmentPlanner) private readonly repo: EntityRepository<InvestmentPlanner>,
        @Inject(INVESTMENT_PLANNER_MODULE_OPTIONS) private options: InvestmentPlannerModuleOptions,
    ) {}

    async retrieveInvestmentPlan(assetId: string) {
        let investment;
        try {
            investment = await this.repo.findOneOrFail({ cloudAssetId: assetId });
        } catch (error) {
            console.error(`Error retrieving plan: ${error}`);
            throw new Error(`Error retrieving plan: ${error}`);
        }
        return investment;
    }

    async createInvestmentPlan(data: CreateInvestmentPlanDTO, _user: UserInfo) {
        const investmentPlan = this.repo.create(data);
        try {
            await this.repo.getEntityManager().persistAndFlush(investmentPlan);
        } catch (error) {
            this.logger.error(`Error creating investment plan: ${error}`);
            throw new Error(`Error creating investment plan: ${error}`);
        }
        return investmentPlan;
    }

    async updateInvestmentPlan(id: string, data: any, _user: UserInfo) {
        const investmentPlan = await this.repo.findOneOrFail({ id: id });
        investmentPlan.remainingShares = investmentPlan.totalShares - data.numberOfShares;
        let investment;
        try {
            investment = await this.repo.getEntityManager().persistAndFlush(investmentPlan);
        } catch (error) {
            this.logger.error(`Error creating investment plan: ${error}`);
            throw new Error(`Error creating investment plan: ${error}`);
        }
        return investment;
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
