import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Column, DataStorageService } from '@pistis/data-storage';
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of, tap } from 'rxjs';

import { AssetRetrievalInfo } from './asset-retrieval-info.entity';
import { CONSUMER_MODULE_OPTIONS } from './consumer.module-definition';
import { ConsumerModuleOptions } from './consumer-module-options.interface';
import { RetrieveDataDTO } from './retrieveData.dto';

@Injectable()
export class ConsumerService {
    private readonly logger = new Logger(ConsumerService.name);

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(AssetRetrievalInfo) private readonly repo: EntityRepository<AssetRetrievalInfo>,
        private readonly dataStorageService: DataStorageService,
        @Inject(CONSUMER_MODULE_OPTIONS) private options: ConsumerModuleOptions,
        private readonly metadataRepositoryService: MetadataRepositoryService,
    ) { }

    async retrieveData(assetId: string, user: any, token: string, _data: RetrieveDataDTO) {
        let factory: any;
        let metadata;

        // let providerFactory;
        try {
            factory = await this.retrieveFactory(token);
        } catch (err) {
            this.logger.error('Factory retrieval error:', err);
        }

        try {
            metadata = await this.metadataRepositoryService.retrieveMetadata(assetId);
        } catch (err) {
            this.logger.error('Metadata retrieval error:', err);
        }
        //FIXME: Uncomment the above when the data-storage fixed
        /*try {
            providerFactory = await this.retrieveProviderFactory(data.assetFactory, token);
        } catch (err) {
            this.logger.error('Provider factory retrieval error:', err);
        }

        const storageUrl = `https://${factory.factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api`;
        let assetInfo: AssetRetrievalInfo | null;
        if (metadata.distributions[0].format.id === 'SQL') {
        try {
            let results: IResults | { error: string | undefined };
            let storeResult: any;
        get offset from db, if it does not exist set is as 0.
        assetInfo = await this.repo.findOne({
            cloudAssetId: assetId,
        });
        let offset = assetInfo?.offset || 0;

        first retrieval of data
        results = await this.getDataFromProvider(assetId, token, {
            offset,
            batchSize: this.options.downloadBatchSize,
            providerPrefix: providerFactory.factoryPrefix,
        });
        if (offset === 0 && 'data' in results) {
        store data in data store
        storeResult = await this.dataStorageService.createTableInStorage(results, token, storageUrl);

        offset += results.data.rows.length;

        store asset retrieval info in consumer's database
        assetInfo = this.repo.create({
            id: storeResult.asset_uuid,
            cloudAssetId: assetId,
            version: storeResult.version_id,
            offset: offset,
        });
        await this.repo.getEntityManager().flush();
        }

        loop to retrieve data in batches
        while (offset % this.options.downloadBatchSize !== 0) {
            if ('columns' in results) {
                results = await this.getDataFromProvider(assetId, token, {
                    offset,
                    batchSize: this.options.downloadBatchSize,
                    columns: results.columns,
                    consumerPrefix: factory.factoryPrefix,
                    providerPrefix: providerFactory.factoryPrefix,
                });
            }

        if (!('data' in results) || !('columns' in results) || results.data.rows.length === 0) break;

        await this.dataStorageService.updateTableInStorage(
            assetId,
            {
                columns: results.columns,
                data: results.data,
            },
            token,
            storageUrl,
        );
        offset += results.data.rows.length;

        if (assetInfo) {
        assetInfo.offset = offset;
        await this.repo.getEntityManager().flush();
        }
        }

        metadata.distributions.forEach((item: any) => {
            item.access_url = [
                `https://${factory.factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api/tables/get_table?asset_uuid=${storeResult['asset_uuid']}`,
            ];
        });
        } catch (err) {
            this.logger.error('Transfer SQL data error:', err);
        }
        } else {
        try {
        const fileResult = await this.getDataFromProvider(assetId, token, {
            consumerPrefix: factory.factoryPrefix,
            providerPrefix: providerFactory.factoryPrefix,
        });

        metadata.distributions.forEach((item: any) => {
            item.access_url = [
                `https://${factory.factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api/tables/get_file?asset_uuid=${fileResult.data.asset_uuid}`,
            ];
        });

        assetInfo = this.repo.create({
            id: fileResult.data.asset_uuid,
            cloudAssetId: assetId,
            version: fileResult.metadata.id,
            offset: 0,
        });
        await this.repo.getEntityManager().persistAndFlush(assetInfo);
            } catch (err) {
                console.log(err)
                this.logger.error('Transfer file data error:', err);
            }
        }
        */

        try {
            await this.metadataRepositoryService.createMetadata(
                metadata,
                this.options.catalogId,
                factory.factoryPrefix,
                token,
            );
        } catch (err) {
            this.logger.error('Metadata creation error:', err);
        }

        const notification = {
            userId: user.id,
            organizationId: user.organizationId,
            type: 'asset_retrieved',
            message: 'Asset retrieval finished',
        };
        const tokenData = {
            grant_type: 'client_credentials',
            client_id: this.options.clientId,
            client_secret: this.options.secret
        }
        return await firstValueFrom(
            this.httpService
                .post(`${this.options.authServerUrl}/PISTIS/protocol/openid-connect/token`, tokenData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                })
                .pipe(
                    map(({ data }) => data.access_token),
                    map((access_token) =>
                        this.httpService
                            .post(`${this.options.notificationsUrl}/srv/notifications/api/notifications`, notification, {
                                headers: getHeaders(access_token),
                            }).subscribe((value) => value)
                    ),
                    tap((response) => this.logger.debug(response)),
                    map(() => of({ message: 'Notification created' })),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Error occurred during notification creation: ', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );
    }

    async getDataFromProvider(
        assetId: string,
        token: string,
        bodyObject?: {
            offset?: number;
            batchSize?: number;
            columns?: Column[];
            consumerPrefix?: string;
            providerPrefix?: string;
        },
    ) {
        return await firstValueFrom(
            this.httpService
                .post(
                    `https://${bodyObject?.providerPrefix}.pistis-market.eu/srv/data-connector/api/provider/${assetId}`,
                    { ...bodyObject },
                    { headers: getHeaders(token) },
                )
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

    private async retrieveFactory(token: string) {
        return await firstValueFrom(
            this.httpService
                .get(`${this.options.factoryRegistryUrl}/api/factories/user-factory`, {
                    headers: getHeaders(token),
                })
                .pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error('Factory retrieval error:', error);
                        return of({ error: 'Error occurred during retrieving factory' });
                    }),
                ),
        );
    }

    private async retrieveProviderFactory(factoryName: string, token: string) {
        return await firstValueFrom(
            this.httpService
                .get(`${this.options.factoryRegistryUrl}/api/factories/name/${factoryName}`, {
                    headers: getHeaders(token),
                })
                .pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error('Factory retrieval error:', error);
                        return of({ error: 'Error occurred during retrieving factory' });
                    }),
                ),
        );
    }
}
