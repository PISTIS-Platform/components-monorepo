import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '@pistis/data-storage';
import { KafkaService } from '@pistis/kafka';
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { v4 as uuidV4 } from 'uuid';

import { QuerySelectorDTO } from './dto';
import { ConfigDataDto } from './dto/configurationData.dto';
import { StreamingDataDto } from './dto/streaming-data.dto';
import { PROVIDER_MODULE_OPTIONS } from './provider.module-definition';
import { ProviderModuleOptions } from './provider-module-options.interface';
import { QuerySelector } from './query-selector.entity';

@Injectable()
export class ProviderService {
    private readonly logger = new Logger(ProviderService.name);
    constructor(
        private readonly dataStorageService: DataStorageService,
        @InjectRepository(QuerySelector) private readonly repo: EntityRepository<QuerySelector>,
        @Inject(PROVIDER_MODULE_OPTIONS) private options: ProviderModuleOptions,
        private readonly metadataRepositoryService: MetadataRepositoryService,
        private readonly kafkaService: KafkaService,
    ) {}

    async downloadDataset(assetId: string, configData: ConfigDataDto, token: string) {
        let data;
        let returnedValue;
        let metadata;

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
                        this.logger.error(`Invalid URL: ${access_url[0]}`);
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
                const querySelector = await this.repo.findOne({ cloudAssetId: assetId });
                if (querySelector) {
                    const selectedColumns: string[] = querySelector.params?.['selectedColumns'] ?? [];
                    const dateRange: Record<string, any> = querySelector.params?.['dateRange'] ?? {};

                    if (Object.keys(dateRange).length > 0) {
                        // TODO: handle dateRange-based retrieval
                    } else {
                        returnedValue = await this.retrieveSqlData(
                            token,
                            configData,
                            storageId[0],
                            metadataName,
                            selectedColumns,
                        );
                    }
                } else {
                    returnedValue = await this.retrieveSqlData(token, configData, storageId[0], metadataName);
                }
            } catch (err) {
                this.logger.error('Provider SQL retrieval error:', err);
                throw new BadGatewayException('Provider SQL retrieval error');
            }
        } else if (metadata.distributions[0].title.en !== 'Kafka Stream') {
            try {
                if (configData.providerPrefix)
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
            if (configData.kafkaConfig && configData.originalId) {
                returnedValue = await this.kafkaService.createMM2Connector({
                    source: { id: configData.originalId },
                    target: configData.kafkaConfig,
                });
            }
        }
        return returnedValue;
    }

    private async retrieveSqlData(
        token: string,
        configData: ConfigDataDto,
        storageId: string,
        metadataName: string[],
        selectedColumns?: string[],
    ) {
        let columnsInfo: any[] = configData.columns || [];
        if (configData.providerPrefix && columnsInfo.length === 0 && configData.offset === 0) {
            const rawColumns = await this.dataStorageService.getColumns(storageId, token, configData.providerPrefix);
            columnsInfo = rawColumns[0].data_model.columns
                .filter((col: any) => !selectedColumns?.length || selectedColumns.includes(col[0]))
                .map((col: any) => ({ name: col[0], dataType: col[1] }));
        }

        const columnsForPagination: Record<string, null> = Object.fromEntries(
            columnsInfo.map((col: any) => [col.name, null]),
        );

        let data;
        if (configData.providerPrefix)
            data = await this.dataStorageService.retrievePaginatedData(
                storageId,
                token,
                configData.offset || 0,
                configData.batchSize || 1000,
                columnsForPagination,
                configData.providerPrefix,
            );

        return {
            data: data && 'data' in data ? data['data'] : { rows: [] },
            metadata: { id: metadataName },
            data_model: { columns: columnsInfo },
        };
    }

    async createKafkaUserAndTopic(assetId: string) {
        this.logger.log(`Creating Kafka user and topic.AssetId: ${assetId}`);

        try {
            const topic = await this.kafkaService.createTopic(assetId);
            const kafkaUser = await this.kafkaService.createProviderUser(assetId);
            return { topic, kafkaUser };
        } catch (e) {
            this.logger.error('Error creating Kafka user and topic:', e);
            throw new BadGatewayException('Error creating Kafka user and topic');
        }
    }

    async createStreamingMetadata(data: StreamingDataDto) {
        const assetId = uuidV4();

        const metadata = {
            id: assetId,
            title: { en: data.title },
            description: { en: data.description },
            categories: [
                {
                    id: data.category,
                },
            ],
            publisher: {
                type: 'Organization',
                email: 'mailto:admin@pistis.eu',
                name: this.options.organisationFullname,
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
                    access_url: [
                        `https://${this.options.factoryPrefix}.pistis-market.eu/srv/data-connector/api/provider/kafka/${assetId}`,
                    ],
                    format: {
                        resource: `http://publications.europa.eu/resource/authority/file-type/${data.format}`,
                    },
                    byte_size: '0',
                },
            ],
        };

        try {
            await this.metadataRepositoryService.createMetadata(
                assetId,
                this.options.catalogOwnedId,
                this.options.factoryPrefix,
                true,
                '',
                metadata,
            );
        } catch (e) {
            this.logger.error(`Error creating streaming metadata:${e}`);
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

    async getTopicDetails(assetId: string) {
        return { url: `${this.options.factoryPrefix}.pistis-market.eu:9094`, topic: `ds-${assetId}` };
    }

    async querySelectorCreate(data: QuerySelectorDTO) {
        const query = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(query);
        return { message: 'Query saved' };
    }

    async deleteQuery(id: string) {
        const query = await this.repo.findOneOrFail({ cloudAssetId: id });
        return await this.repo.getEntityManager().removeAndFlush(query);
    }

    async deleteKafkaTopicAndUser(assetId: string) {
        await this.kafkaService.deleteTopic(assetId);
        await this.kafkaService.deleteUser(assetId);
        await this.kafkaService.deleteMM2ConnectorsBySourceId(assetId);
    }
}
