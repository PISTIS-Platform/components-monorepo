import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Column, DataStorageService } from '@pistis/data-storage';
import { KafkaService } from '@pistis/kafka';
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';

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

    async retrieveData(em: EntityManager, assetId: string, user: any, token: string, _data: RetrieveDataDTO) {
        // let factory: any;
        let metadata;
        // let lineageData: any;
        let isStreamingData: boolean;

        // let providerFactory: any;
        // try {
        //     factory = await this.retrieveFactory(token);
        // } catch (err) {
        //     this.logger.error('Factory retrieval error:', err);
        //     throw new NotFoundException(`Factory not found: ${err}`);
        // }

        try {
            metadata = await this.retrieveMetadata(assetId);
        } catch (err) {
            this.logger.error('Metadata retrieval error:', err);
            throw new BadGatewayException('Metadata retrieval error');
        }

        // try {
        //     providerFactory = await this.retrieveProviderFactory(data.assetFactory, token);
        // } catch (err) {
        //     this.logger.error('Provider factory retrieval error:', err);
        //     throw new NotFoundException(`Provider factory not found: ${err}`);
        // }

        const accessId = metadata.distributions.map((distribution: any) => {
            const accessUrl = distribution.access_url[0].split('/');
            return accessUrl[7].split('=')[1];
        });

        //FIXME: temporary solution to avoid lineage data throw an error and stop the process
        // try {
        // const lineageData = await this.metadataRepositoryService.retrieveLineage(accessId[0], token);
        // } catch (err) {
        //     this.logger.error('Lineage retrieval error:', err);
        //     throw new BadGatewayException('Lineage retrieval error');
        // }

        // `https://${factory.factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api`
        const storageUrl = `https://develop.pistis-market.eu/srv/factory-data-storage/api`;
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
                assetInfo = await em.findOne(AssetRetrievalInfo, {
                    cloudAssetId: assetId,
                });

                let offset = 0;

                if (assetInfo) {
                    offset = assetInfo.offset ?? 0;
                }

                // first retrieval of data
                results = await this.getDataFromProvider(assetId, token, {
                    offset,
                    batchSize: 1000,
                    // providerFactory.factoryPrefix
                    providerPrefix: 'acme',
                });

                if (offset === 0 && 'data' in results) {
                    // store data in data store
                    storeResult = await this.dataStorageService.createTableInStorage(
                        results,
                        token,
                        'develop',
                        // factory.factoryPrefix,
                    );

                    offset += results.data.data.rows.length;

                    // store asset retrieval info in consumer's database
                    assetInfo = em.create(AssetRetrievalInfo, {
                        id: storeResult.asset_uuid,
                        cloudAssetId: assetId,
                        version: storeResult.version_id,
                        offset: offset,
                    });
                    await em.upsert(AssetRetrievalInfo, assetInfo);
                }

                // loop to retrieve data in batches
                while (offset % this.options.downloadBatchSize !== 0) {
                    if ('columns' in results) {
                        results = await this.getDataFromProvider(assetId, token, {
                            offset,
                            batchSize: this.options.downloadBatchSize,
                            columns: results.columns,
                            // factory.factoryPrefix
                            consumerPrefix: 'develop',
                            //  providerFactory.factoryPrefix
                            providerPrefix: 'acme',
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
                        await em.nativeUpdate(AssetRetrievalInfo, { cloudAssetId: assetId }, { offset });
                    }
                }
            } catch (err) {
                this.logger.error('Transfer SQL data error:', err);
                throw new BadGatewayException('Transfer SQL data error');
            }
        } else if (format[0] === 'CSV' && metadata.distributions[0].title.en !== 'Kafka Stream') {
            try {
                const fileResult = await this.getDataFromProvider(assetId, token, {
                    // providerFactory.factoryPrefix
                    providerPrefix: 'acme',
                });
                console.log(fileResult);
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
                    'develop',
                    // factory.factoryPrefix,
                );

                assetInfo = await em.upsert(AssetRetrievalInfo, {
                    id: createFile.asset_uuid,
                    cloudAssetId: assetId,
                    version: '',
                    offset: 0,
                });
            } catch (err) {
                this.logger.error('Transfer file data error:', err);
                throw new BadGatewayException('Transfer file data error');
            }
        } else {
            try {
                const consumerAssetId = uuidV4();
                // `https://${factory.factoryPrefix}.pistis-market.eu:9094`
                const url = `https://develop.pistis-market.eu:9094`;
                const { kafkaUser } = await this.createKafkaUserAndTopic(consumerAssetId);
                await this.getDataFromProvider(assetId, token, {
                    // factory.factoryPrefix
                    consumerPrefix: 'develop',
                    //
                    providerPrefix: 'acme',
                    kafkaConfig: {
                        id: consumerAssetId,
                        username: kafkaUser.name,
                        password: kafkaUser.secret,
                        bootstrapServers: url,
                    },
                });
                metadata.distributions.map((item: any) => {
                    if (item.access_url) {
                        return (item.access_url = [url]);
                    }
                    return;
                });

                assetInfo = await em.upsert(AssetRetrievalInfo, {
                    id: consumerAssetId,
                    cloudAssetId: assetId,
                    version: '',
                    offset: 0,
                });
            } catch (err) {
                this.logger.error('Transfer streaming data error:', err);
                throw new BadGatewayException('Transfer streaming data error');
            }
        }

        try {
            isStreamingData = !(format[0] === 'SQL' || format[0] === 'CSV');
            await this.metadataRepositoryService.createMetadata(
                assetInfo?.id,
                'acquired-data',
                // this.options.catalogId,
                'develop',
                // factory.factoryPrefix,
                isStreamingData,
                assetId,
                '',
            );
        } catch (err) {
            this.logger.error('Metadata creation error:', err);
            throw new BadGatewayException('Metadata creation error');
        }

        //FIXME: temporary solution to avoid lineage data throw an error and stop the process
        // try {
        // await this.metadataRepositoryService.createLineage(lineageData, token, /*factory.factoryPrefix*/ 'develop');
        // } catch (err) {
        //     this.logger.error('Metadata creation error:', err);
        //     throw new BadGatewayException('Metadata creation error');
        // }
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
            kafkaConfig?: {
                id: string;
                username: string;
                password: string;
                bootstrapServers: string;
            };
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

    async getAssetId(cloudAssetId: string) {
        return (await this.repo.findOne({ cloudAssetId }))?.id;
    }

    async deleteKafkaStream(source: string, target: string) {
        await this.kafkaService.deleteMM2Connector(source, target);
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

    async retrieveMetadata(assetId: string) {
        return await this.metadataRepositoryService.retrieveMetadata(assetId);
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

    async getFactoryConnectionDetails() {
        this.logger.log('Retrieving factory kafka connection details...');
        return await this.kafkaService.getFactoryConnectionDetails();
    }
}
