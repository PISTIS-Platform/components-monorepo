import { EntityManager } from '@mikro-orm/core';
import { HttpService } from '@nestjs/axios';
import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull'; // FIX: Correct imports for @nestjs/bull
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import { Job } from 'bull'; // FIX: Use Job from 'bull'
import dayjs from 'dayjs';
import { catchError, firstValueFrom, map, switchMap, tap, throwError } from 'rxjs';

import { CONSUMER_MODULE_OPTIONS } from './consumer.module-definition';
import { ConsumerService } from './consumer.service';
import { ConsumerModuleOptions } from './consumer-module-options.interface';

@Processor('default')
@Injectable()
export class ConnectorProcessor {
    private readonly logger = new Logger(ConnectorProcessor.name);

    constructor(
        private readonly em: EntityManager,
        private readonly consumerService: ConsumerService,
        @Inject(CONSUMER_MODULE_OPTIONS) private options: ConsumerModuleOptions,
        private readonly httpService: HttpService,
    ) {}

    @Process('retrieveData')
    async handleImidiateDataRetrieval(job: Job<any>): Promise<any> {
        const forkedEm = this.em.fork();
        await this.consumerService.retrieveData(
            forkedEm,
            job.data.assetId,
            job.data.user,
            job.data.token,
            job.data.data,
        );
    }

    @Process('retrieveScheduledData')
    async handleScheduledDataRetrieval(job: Job<any>): Promise<any> {
        const forkedEm = this.em.fork();
        await this.consumerService.retrieveData(
            forkedEm,
            job.data.assetId,
            job.data.user,
            job.data.token,
            job.data.data,
        );
    }

    private getNow() {
        return dayjs(new Date()).format('DD/MM/YYYY HH:mm:ss');
    }

    private async notifications(notification: any) {
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
                    data: tokenData,
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

    @OnQueueActive()
    async onActive(job: Job) {
        job.log(`📦 Job Active! (Date: ${this.getNow()} UTC)`);
    }

    @OnQueueCompleted()
    async onCompleted(job: Job) {
        job.log(`✅ Job Completed! (Date: ${this.getNow()} UTC)`);
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

    @OnQueueFailed()
    async onFailed(job: Job) {
        job.log(`❌ Job Failed (Date: ${this.getNow()} UTC) :`);
        job.log(job.failedReason || 'Unknown error');
        const notification = {
            userId: job.data.user.id,
            organizationId: job.data.user.organizationId,
            type: 'asset_retrieval_failure',
            message: 'Asset retrieval failed, please contact data provider',
        };
        await this.notifications(notification);
    }
}
