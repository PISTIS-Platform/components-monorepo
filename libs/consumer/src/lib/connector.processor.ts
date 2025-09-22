import { EntityManager } from '@mikro-orm/core';
import { HttpService } from '@nestjs/axios';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'; // FIX: Correct imports for @nestjs/bull
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { CONNECTOR_QUEUE } from '@pistis/bullMq';
import { getHeaders } from '@pistis/shared';
import { Job } from 'bullmq';
import dayjs from 'dayjs';
import { catchError, firstValueFrom, map, of, switchMap, tap, throwError } from 'rxjs';

import { AssetRetrievalInfo } from './asset-retrieval-info.entity';
import { CONSUMER_MODULE_OPTIONS } from './consumer.module-definition';
import { ConsumerService } from './consumer.service';
import { ConsumerModuleOptions } from './consumer-module-options.interface';

@Processor(CONNECTOR_QUEUE)
@Injectable()
export class ConnectorProcessor extends WorkerHost {
    private readonly logger = new Logger(ConnectorProcessor.name);

    constructor(
        private readonly em: EntityManager,
        private readonly consumerService: ConsumerService,
        @Inject(CONSUMER_MODULE_OPTIONS) private options: ConsumerModuleOptions,
        private readonly httpService: HttpService,
    ) {
        super();
    }

    private readonly tokenData = {
        grant_type: 'client_credentials',
        client_id: this.options.clientId,
        client_secret: this.options.secret,
    };

    async process(job: Job<any, any, string>): Promise<any> {
        switch (job.name) {
            case 'retrieveData': {
                const forkedEm = this.em.fork();
                return await this.consumerService.retrieveData(
                    forkedEm,
                    job.data.assetId,
                    job.data.user,
                    job.data.token,
                    job.data.data,
                );
            }
            case 'retrieveScheduledData': {
                const forkedEm = this.em.fork();
                if (job.data.endDate && new Date() > new Date(job.data.endDate)) {
                    this.logger.verbose(`Job for ${job.data.assetId} reached endDate. Removing repeatable job.`);
                    await job.remove(); // remove repeatable job
                    return;
                }
                return await this.consumerService.retrieveData(
                    forkedEm,
                    job.data.assetId,
                    job.data.user,
                    job.data.token,
                    job.data.data,
                );
            }
            case 'deleteStreamingConnector': {
                if (job.data.endDate && new Date() > new Date(job.data.endDate)) {
                    this.logger.verbose(`Job for ${job.data.assetId} reached endDate. Removing repeatable job.`);
                    await job.remove(); // remove repeatable job
                    return;
                }
                return await this.consumerService.deleteKafkaStream(job.data.assetId, job.data.target);
            }
        }
    }

    private getNow() {
        return dayjs(new Date()).format('DD/MM/YYYY HH:mm:ss');
    }

    private async notifications(notification: any) {
        return await firstValueFrom(
            this.httpService
                .post(`${this.options.authServerUrl}/realms/PISTIS/protocol/openid-connect/token`, this.tokenData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    data: this.tokenData,
                })
                .pipe(
                    map(({ data }) => data.access_token),
                    switchMap((access_token) =>
                        this.httpService.post(
                            `${this.options.notificationsUrl}/srv/notifications/api/notifications`,
                            notification,
                            {
                                headers: getHeaders(access_token),
                            },
                        ),
                    ),
                    tap((response) => this.logger.debug(response)),
                    catchError((error) => {
                        this.logger.error('Error occurred during notification creation: ', error);
                        return throwError(() => new BadRequestException('Error occurred during notification creation'));
                    }),
                ),
        );
    }

    private async createTransaction(transaction: any) {
        await firstValueFrom(
            this.httpService
                .post(`${this.options.authServerUrl}/realms/PISTIS/protocol/openid-connect/token`, this.tokenData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    data: this.tokenData,
                })
                .pipe(
                    map(({ data }) => data.access_token),
                    switchMap((access_token) =>
                        this.httpService.post(
                            `${this.options.transactionAuditorUrl}/srv/transactions-auditor/api/transactions-auditor/`,
                            transaction,
                            { headers: getHeaders(access_token) },
                        ),
                    ),
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error('Transaction creation error:', error);
                        return of({ error: 'Error occurred during transaction creation' });
                    }),
                ),
        );
    }

    @OnWorkerEvent('active')
    async onActive(job: Job) {
        job.log(`📦 Job ${job.id} Active! (Date: ${this.getNow()} UTC)`);
    }

    @OnWorkerEvent('completed')
    async onCompleted(job: Job) {
        this.logger.log(`✅ Job ${job.id} Completed! (Date: ${this.getNow()} UTC)`);
        await this.em.nativeUpdate(AssetRetrievalInfo, { cloudAssetId: job.data.assetId }, { updatedAt: new Date() });
        const transaction = {
            transactionId: job.returnvalue.transactionId,
            transactionFee: job.returnvalue.transactionFee,
            amount: job.returnvalue.amount,
            factoryBuyerId: job.returnvalue.factoryBuyerId,
            factoryBuyerName: job.returnvalue.factoryBuyerName,
            factorySellerId: job.returnvalue.assetId,
            factorySellerName: job.returnvalue.assetName,
            assetId: job.returnvalue.assetId,
            assetName: job.returnvalue.assetName,
            terms: job.returnvalue.terms,
        };

        await this.createTransaction(transaction);
        const notification = {
            userId: job.data.user.id,
            organizationId: job.data.user.organizationId,
            type: job.data.format !== 'SQL' && job.data.format !== 'CSV' ? 'streaming_data' : 'asset_retrieved',
            message:
                job.data.format !== 'SQL' && job.data.format !== 'CSV'
                    ? 'Streaming data retrieval'
                    : 'Asset retrieval finished',
        };
        await this.notifications(notification);
    }

    @OnWorkerEvent('failed')
    async onFailed(job: Job) {
        this.logger.log(`❌ Job ${job.id} Failed (Date: ${this.getNow()} UTC) :`);
        this.logger.log(job.failedReason || 'Unknown error');
        await this.em.nativeDelete(AssetRetrievalInfo, {
            cloudAssetId: job.data.assetId,
        });

        const notification = {
            userId: job.data.user.id,
            organizationId: job.data.user.organizationId,
            type: 'asset_retrieval_failure',
            message: 'Asset retrieval failed, please contact data provider',
        };
        await this.notifications(notification);
    }
}
