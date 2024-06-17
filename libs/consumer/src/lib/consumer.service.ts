import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Column, CreateTable, DataStorageService } from '@pistis/data-storage';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { AssetRetrievalInfo } from './asset-retrieval-info.entity';
import { CONSUMER_MODULE_OPTIONS } from './consumer.module-definition';
import { ConsumerModuleOptions } from './consumer-module-options.interface';
import { IResults } from './typings';

@Injectable()
export class ConsumerService {
    private readonly logger = new Logger(ConsumerService.name);

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(AssetRetrievalInfo) private readonly repo: EntityRepository<AssetRetrievalInfo>,
        private readonly dataStorageService: DataStorageService,
        @Inject(CONSUMER_MODULE_OPTIONS) private options: ConsumerModuleOptions,
    ) {}

    async retrieveData(contractId: string, assetId: string, userId: string, token: string) {
        //FIXME: change types in variables when we have actual results

        const factoryId = ''; //FIXME we need to specify what we should use to find provider factory
        const providerFactory = await firstValueFrom(
            this.httpService
                .get(`${this.options.factoryRegistryUrl}/${factoryId}`, {
                    headers: getHeaders(token),
                })
                .pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error('Provider factory ip retrieval error:', error);
                        return of({ error: 'Error occurred during retrieving provider factory info' });
                    }),
                ),
        );

        const providerUrl = providerFactory.ip;

        let results: IResults | { error: string | undefined };

        //get offset from db, if it does not exist set is as 0.
        //FIXME: check what we should use to find any possible asset in db (e.g. if we will search by provider too)
        let assetInfo = await this.repo.findOne({
            cloudAssetId: assetId,
        });
        let offset = assetInfo?.offset || 0;

        //first retrieval of data
        results = await this.getDataFromProvider(
            {
                offset,
                batchSize: this.options.downloadBatchSize,
            },
            providerUrl,
            assetId,
            token,
        );

        if (offset === 0 && 'data' in results) {
            //store data in data store
            const storeResult: CreateTable = await this.dataStorageService.createTableInStorage(results, token);

            offset += results.data.rows.length;

            //store asset retrieval info in consumer's database
            assetInfo = this.repo.create({
                id: storeResult.assetUUID,
                cloudAssetId: assetId,
                version: storeResult.version_id,
                offset: offset,
            });
            await this.repo.getEntityManager().flush();
        }

        // loop to retrieve data in batches
        while (offset % this.options.downloadBatchSize !== 0) {
            if ('columns' in results) {
                results = await this.getDataFromProvider(
                    {
                        offset,
                        batchSize: this.options.downloadBatchSize,
                        columns: results.columns,
                    },
                    providerUrl,
                    assetId,
                    token,
                );
            }

            if (!('data' in results) || !('columns' in results) || results.data.rows.length === 0) break;

            await this.dataStorageService.updateTableInStorage(
                assetId,
                {
                    columns: results.columns,
                    data: results.data,
                },
                token,
            );
            offset += results.data.rows.length;

            if (assetInfo) {
                assetInfo.offset = offset;
                await this.repo.getEntityManager().flush();
            }
        }

        const notification = {
            userId,
            organizationId: '', //FIXME: Replace this with actual organization id,
            type: 'asset_retrieved',
            message: 'Asset retrieval finished',
        };
        return await firstValueFrom(
            this.httpService
                .post(`${this.options.notificationsUrl}/notifications`, notification, {
                    headers: getHeaders(token),
                })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(() => {
                        return { message: 'Notification created' };
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Notification creation error:', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );
    }

    async getDataFromProvider(
        bodyObject: {
            offset: number;
            batchSize: number;
            columns?: Column[];
        },
        providerUrl: string,
        assetId: string,
        token: string,
    ): Promise<IResults | { error: string | undefined }> {
        return await firstValueFrom(
            this.httpService
                .post(`${providerUrl}/provider/${assetId}`, { ...bodyObject }, { headers: getHeaders(token) })
                .pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error('Provider download dataset error:', error);
                        return of({ error: 'Error occurred during retrieving data from provider' });
                    }),
                ),
        );
    }
}
