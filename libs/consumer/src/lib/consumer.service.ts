import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import {
    BadGatewayException,
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Column, DataStorageService } from '@pistis/data-storage';
import { KafkaService } from '@pistis/kafka';
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of, tap, throwError } from 'rxjs';

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
        private readonly kafkaService: KafkaService,
    ) {}

    async retrieveData(assetId: string, user: any, token: string, data: RetrieveDataDTO) {
        let factory: any;
        let metadata;
        let isStreamingData: boolean;

        let providerFactory: any;
        try {
            factory = await this.retrieveFactory(token);
        } catch (err) {
            this.logger.error('Factory retrieval error:', err);
            throw new NotFoundException(`Factory not found: ${err}`);
        }

        try {
            metadata = await this.metadataRepositoryService.retrieveMetadata(assetId);
        } catch (err) {
            this.logger.error('Metadata retrieval error:', err);
            throw new BadGatewayException('Metadata retrieval error');
        }

        try {
            providerFactory = await this.retrieveProviderFactory(data.assetFactory, token);
        } catch (err) {
            this.logger.error('Provider factory retrieval error:', err);
            throw new NotFoundException(`Provider factory not found: ${err}`);
        }

        const storageUrl = `https://${factory.factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api`;
        let assetInfo: AssetRetrievalInfo | null;
        const format = metadata.distributions
            .map(({ format }: any) => format?.id ?? null)
            .filter((id: any) => id !== null);
        if (format.length === 0) {
            this.logger.error('Format not found');
            throw new BadRequestException('Distribution format not found');
        }

        if (format[0] === 'SQL') {
            try {
                let results: any;
                let storeResult: any;
                // get offset from db, if it does not exist set is as 0.
                assetInfo = await this.repo.findOne({
                    cloudAssetId: assetId,
                });

                let offset = 0;

                // first retrieval of data
                results = await this.getDataFromProvider(assetId, token, {
                    offset,
                    batchSize: 1000,
                    providerPrefix: providerFactory.factoryPrefix,
                });

                if (offset === 0 && 'data' in results) {
                    // store data in data store
                    storeResult = await this.dataStorageService.createTableInStorage(
                        results,
                        token,
                        factory.factoryPrefix,
                    );

                    offset += results.data.data.rows.length;

                    // store asset retrieval info in consumer's database
                    assetInfo = this.repo.create({
                        id: storeResult.asset_uuid,
                        cloudAssetId: assetId,
                        version: storeResult.version_id,
                        offset: offset,
                    });
                    await this.repo.getEntityManager().flush();
                }

                // loop to retrieve data in batches
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

                metadata.distributions.map((item: any) => {
                    if (item.access_url) {
                        return (item.access_url = [
                            `https://${factory.factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api/tables/get_table?asset_uuid=${storeResult['asset_uuid']}`,
                        ]);
                    }
                    return;
                });
            } catch (err) {
                this.logger.error('Transfer SQL data error:', err);
                throw new BadGatewayException('Transfer SQL data error');
            }
        } else if (format[0] === 'CSV') {
            try {
                const fileResult = await this.getDataFromProvider(assetId, token, {
                    providerPrefix: providerFactory.factoryPrefix,
                });

                const title = metadata.distributions
                    .map((distribution: any) => {
                        const titleObject = distribution.title;

                        if (titleObject && Object.keys(titleObject).length > 0) {
                            return Object.values(titleObject)[0] as string;
                        }
                        return null;
                    })
                    .filter((title: string | null) => title !== null); // Filter out nulls
                const createFile = await this.dataStorageService.createFile(
                    fileResult,
                    title[0],
                    token,
                    factory.factoryPrefix,
                );

                metadata.distributions.map((item: any) => {
                    if (item.access_url) {
                        return (item.access_url = [
                            `https://${factory.factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api/files/get_file?asset_uuid=${createFile.asset_uuid}`,
                        ]);
                    }
                    return;
                });

                assetInfo = this.repo.create({
                    id: createFile.asset_uuid,
                    cloudAssetId: assetId,
                    version: '',
                    offset: 0,
                });
                await this.repo.getEntityManager().persistAndFlush(assetInfo);
            } catch (err) {
                this.logger.error('Transfer file data error:', err);
                throw new BadGatewayException('Transfer file data error');
            }
        } else {
            metadata.distributions.map((item: any) => {
                if (item.access_url) {
                    return (item.access_url = [`https://${factory.factoryPrefix}.pistis-market.eu:9092`]);
                }
                return;
            });
        }

        try {
            isStreamingData = !(format[0] === 'SQL' || format[0] === 'CSV');
            await this.metadataRepositoryService.createMetadata(
                metadata,
                this.options.catalogId,
                factory.factoryPrefix,
                isStreamingData,
            );
        } catch (err) {
            this.logger.error('Metadata creation error:', err);
            throw new BadGatewayException('Metadata creation error');
        }

        let notification: any;
        if (format[0] === 'SQL' || format[0] === 'CSV') {
            notification = {
                userId: user.id,
                organizationId: user.organizationId,
                type: 'asset_retrieved',
                message: 'Asset retrieval finished',
            };
        } else {
            notification = {
                userId: user.id,
                organizationId: user.organizationId,
                type: 'streaming_data',
                message: 'Streaming data retrieval',
            };
        }
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

    private async retrieveProviderFactory(orgId: string, token: string) {
        return await firstValueFrom(
            this.httpService
                .get(`${this.options.factoryRegistryUrl}/api/factories/organization/${orgId}`, {
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

    async createKafkaUserAndTopic(assetId: string) {
        this.logger.log('Creating Kafka user and topic...');

        try {
            const topic = await this.kafkaService.createTopic(assetId);
            const kafkaUser = await this.kafkaService.createConsumerUser(assetId);
            return { topic, kafkaUser };
        } catch (e) {
            this.logger.error('Error creating Kafka user and topic:', e);
            throw new BadGatewayException('Error creating Kafka user and topic');
        }
    }

    async getFactoryConnectionDetails(token: string) {
        return await this.kafkaService.getFactoryConnectionDetails(token);
    }
}
