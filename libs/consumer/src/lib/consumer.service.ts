import { EntityManager, EntityRepository } from '@mikro-orm/core';
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
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';

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
    ) {}

    async retrieveData(em: EntityManager, assetId: string, user: any, token: string, data: RetrieveDataDTO) {
        let factory: any;
        let metadata;
        let lineageData: any;

        let providerFactory: any;
        try {
            factory = await this.retrieveFactory(token);
        } catch (err) {
            this.logger.error('Factory retrieval error:', err);
            throw new NotFoundException(`Factory not found: ${err}`);
        }

        try {
            metadata = await this.retrieveMetadata(assetId);
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

        const accessId = metadata.distributions.map((distribution: any) => {
            const accessUrl = distribution.access_url[0].split('/');
            return accessUrl[7].split('=')[1];
        });

        try {
            lineageData = await this.metadataRepositoryService.retrieveLineage(accessId[0], token);
        } catch (err) {
            this.logger.error('Lineage retrieval error:', err);
            throw new BadGatewayException('Lineage retrieval error');
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
                assetInfo = await em.findOne(AssetRetrievalInfo, {
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
                    assetInfo = em.create(AssetRetrievalInfo, {
                        id: storeResult.asset_uuid,
                        cloudAssetId: assetId,
                        version: storeResult.version_id,
                        offset: offset,
                    });
                    await em.flush();
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
                        await em.flush();
                    }
                }
            } catch (err) {
                this.logger.error('Transfer SQL data error:', err);
                throw new BadGatewayException('Transfer SQL data error');
            }
        } else {
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

                assetInfo = em.create(AssetRetrievalInfo, {
                    id: createFile.asset_uuid,
                    cloudAssetId: assetId,
                    version: '',
                    offset: 0,
                });
                await em.persistAndFlush(assetInfo);
            } catch (err) {
                this.logger.error('Transfer file data error:', err);
                throw new BadGatewayException('Transfer file data error');
            }
        }

        try {
            await this.metadataRepositoryService.createMetadata(
                assetInfo?.id,
                this.options.catalogId,
                factory.factoryPrefix,
                assetId,
            );
        } catch (err) {
            this.logger.error('Metadata creation error:', err);
            throw new BadGatewayException('Metadata creation error');
        }

        try {
            await this.metadataRepositoryService.createLineage(lineageData, token, factory.factoryPrefix);
        } catch (err) {
            this.logger.error('Metadata creation error:', err);
            throw new BadGatewayException('Metadata creation error');
        }
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

    async retrieveMetadata(assetId: string) {
        return await this.metadataRepositoryService.retrieveMetadata(assetId);
    }
}
