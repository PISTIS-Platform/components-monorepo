import { HttpService } from '@nestjs/axios';
import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '@pistis/data-storage';
import { KafkaService } from '@pistis/kafka';
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';

import { ConfigDataDto } from './dto/configurationData.dto';
import { StreamingDataDto } from './dto/streaming-data.dto';
import { PROVIDER_MODULE_OPTIONS } from './provider.module-definition';
import { ProviderModuleOptions } from './provider-module-options.interface';

@Injectable()
export class ProviderService {
    private readonly logger = new Logger(ProviderService.name);
    constructor(
        private readonly dataStorageService: DataStorageService,
        @Inject(PROVIDER_MODULE_OPTIONS) private options: ProviderModuleOptions,
        private readonly metadataRepositoryService: MetadataRepositoryService,
        private readonly kafkaService: KafkaService,
        private readonly httpService: HttpService,
    ) {}

    async downloadDataset(assetId: string, configData: ConfigDataDto, token: string) {
        let data;
        let returnedValue;
        let metadata;

        let columnsInfo = configData.columns || [];
        try {
            metadata = await this.metadataRepositoryService.retrieveMetadata(assetId);
        } catch (err) {
            this.logger.error('Metadata retrieval error:', err);
            throw new BadGatewayException('Metadata retrieval error');
        }

        const metadataName = metadata.distributions
            .map(({ title }: any) => title?.en ?? null)
            .filter((en: any) => en !== null);
        const storageId = metadata.distributions
            .map(({ access_url }: any) => {
                if (access_url && access_url[0]) {
                    try {
                        const url = new URL(access_url[0]);
                        return url.searchParams.get('asset_uuid');
                    } catch (error) {
                        console.error('Invalid URL:', access_url[0]);
                        return null;
                    }
                }
                return null;
            })
            .filter((storageId: string | null) => storageId !== null);

        const format = metadata.distributions
            .map(({ format }: any) => format?.id ?? null)
            .filter((id: any) => id !== null);

        if (format.length === 0) {
            this.logger.error('Format not found');
            throw new BadRequestException('Distribution format not found');
        }

        if (format[0] === 'SQL') {
            try {
                // In case the consumer asked for columns and metadata
                // (if columns were not send in dto (during first retrieval), the provider needs to retrieve them below)

                if (columnsInfo.length === 0 && configData.offset === 0) {
                    columnsInfo = await this.dataStorageService.getColumns(
                        storageId[0],
                        token,
                        configData.providerPrefix,
                    );
                }
                //transform this into the object needed for columns , for retrieving paginated data
                const columnsForPagination: Record<string, null> = Object.fromEntries(
                    columnsInfo[0].data_model.columns.map((column: any) => [column[0], null]),
                );

                //transform columns to send to consumer for table creation
                const columnsForNewTable: Record<string, null> = columnsInfo[0].data_model.columns.map(
                    (column: any) => {
                        const [name, dataType] = column;
                        return { name, dataType };
                    },
                );

                //use data storage functions
                data = await this.dataStorageService.retrievePaginatedData(
                    storageId,
                    token,
                    configData.offset || 0,
                    configData.batchSize || 1000,
                    columnsForPagination,
                    configData.providerPrefix,
                );

                returnedValue = {
                    data: data,
                    metadata: { id: metadataName },
                    data_model: { columns: columnsForNewTable },
                };
            } catch (err) {
                this.logger.error('Provider SQL retrieval error:', err);
                throw new BadGatewayException('Provider SQL retrieval error');
            }
        } else if (format[0] === 'CSV') {
            try {
                data = await this.dataStorageService.retrieveFile(storageId, token, configData.providerPrefix);

                returnedValue = {
                    data,
                    metadata: { id: metadataName },
                    data_model: 'columnsInfo',
                };
            } catch (err) {
                this.logger.error('Provider File retrieval error:', err);
                throw new BadGatewayException('Provider File retrieval error');
            }
        } else {
            if (configData.kafkaConfig) {
                returnedValue = await this.kafkaService.createMM2Connector({
                    source: { id: assetId },
                    target: configData.kafkaConfig,
                });
            }
        }
        return returnedValue;
    }

    async createKafkaUserAndTopic(assetId: string) {
        this.logger.log('Creating Kafka user and topic...');

        try {
            const topic = await this.kafkaService.createTopic(assetId);
            const kafkaUser = await this.kafkaService.createProviderUser(assetId);
            return { topic, kafkaUser };
        } catch (e) {
            this.logger.error('Error creating Kafka user and topic:', e);
            throw new BadGatewayException('Error creating Kafka user and topic');
        }
    }

    async createStreamingMetadata(_token: string, data: StreamingDataDto) {
        // let factory;
        const assetId = uuidV4();

        // try {
        //     factory = await this.retrieveFactory(token);
        // } catch (err) {
        //     this.logger.error('Factory retrieval error:', err);
        //     throw new NotFoundException(`Factory not found: ${err}`);
        // }

        const metadata = {
            id: '54a29573-7263-4f6f-b51b-3be6fbe07128',
            title: { en: data.title },
            description: { en: data.description },
            publisher: {
                type: 'Organization',
                email: 'mailto:admin@pistis.eu',
                //TODO add from env variables the full factory name
                name: 'DEVELOP',
            },
            keywords: null,
            monetization: [
                {
                    purchase_offer: [
                        {
                            license: {
                                id: '_:g1',
                                label: 'Subscription License',
                                description: 'Subscription License',
                                resource: 'https://pistis-market.eu/license/497c3001-8ab2-4a3f-8e3d-5dba6ac0760b',
                            },
                        },
                    ],
                },
            ],
            distributions: [
                {
                    title: { en: 'Kafka Stream' },
                    access_url: [`http://develop.pistis-market.eu:9094`],
                    format: {
                        resource: 'http://publications.europa.eu/resource/authority/file-type/CSV',
                    },
                    byte_size: '0',
                },
            ],
        };
        //TODO return this ${factory.factoryPrefix} to accessUrl
        try {
            await this.metadataRepositoryService.createMetadata(
                assetId,
                this.options.catalogOwnedId,
                'develop',
                // factory.factoryPrefix,
                true,
                '',
                metadata,
            );
        } catch (e) {
            console.log(e);
            this.logger.error('Error creating streaming metadata:', e);
            throw new BadGatewayException('Error creating streaming metadata');
        }

        try {
            const data = await this.createKafkaUserAndTopic(assetId);
            return { id: assetId, ...data, ...this.kafkaService.getKafkaConfig() };
        } catch (e) {
            this.logger.error('Error creating kafka user and topic:', e);
            throw new BadGatewayException('Error creating kafka user and topic');
        }
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
}
