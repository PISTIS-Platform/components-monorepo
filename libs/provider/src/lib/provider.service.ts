import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '@pistis/data-storage';
import { KafkaService } from '@pistis/kafka';
import { MetadataRepositoryService } from '@pistis/metadata-repository';
import { v4 as uuidV4 } from 'uuid';

import { QuerySelectorDTO } from './dto';
import { ColumnDto, ConfigDataDto } from './dto/configurationData.dto';
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

        const isKafkaStream = metadata.distributions[0]?.title?.en === 'Kafka Stream';
        if (isKafkaStream) {
            if (configData.kafkaConfig && configData.originalId) {
                return await this.kafkaService.createMM2Connector({
                    source: { id: configData.originalId },
                    target: configData.kafkaConfig,
                });
            }
            return;
        }

        const metadataId: string | null =
            metadata.distributions
                .map(({ title }: any) => title?.en ?? null)
                .find((en: string | null) => en !== null) ?? null;

        if (!metadataId) {
            this.logger.error('Metadata ID not found');
            throw new BadRequestException('Metadata ID not found');
        }
        const storageId: string | null =
            metadata.distributions
                .map(({ access_url }: any) => {
                    const [url] = Array.isArray(access_url) ? access_url : [];
                    if (!url) return null;
                    try {
                        return new URL(url).searchParams.get('asset_uuid');
                    } catch {
                        this.logger.error(`Invalid URL: ${url}`);
                        return null;
                    }
                })
                .find((id: string | null) => id !== null) ?? null;

        if (!storageId) {
            this.logger.error('Storage ID not found');
            throw new BadRequestException('Storage ID not found');
        }

        const format: string | null =
            metadata.distributions
                .map(({ format }: any) => format?.id ?? null)
                .find((id: string | null) => id !== null) ?? null;

        if (!format) {
            this.logger.error('Format not found');
            throw new BadRequestException('Distribution format not found');
        }

        if (!configData.providerPrefix) {
            this.logger.error('Provider prefix not found');
            throw new BadRequestException('Provider prefix not found');
        }

        const { providerPrefix, offset, batchSize, columns } = configData;

        if (format === 'SQL') {
            try {
                const querySelector = await this.repo.findOne({ cloudAssetId: assetId });
                let res: { data: any; data_model: { columns: any[] } };

                const selectedColumns: string[] = querySelector?.params?.['selectedColumns'] ?? [];
                const dateRange: Record<string, any> = querySelector?.params?.['dateRange'] ?? {};
                const resolvedColumns = columns?.length
                    ? columns
                    : await this.fetchColumns(storageId, token, providerPrefix, selectedColumns);

                if (querySelector && Object.keys(dateRange).length > 0) {
                    res = await this.fetchRowsByDateRange(token, providerPrefix, storageId, dateRange, resolvedColumns);
                } else {
                    res = await this.fetchRows(token, providerPrefix, storageId, offset, batchSize, resolvedColumns);
                }

                returnedValue = { ...res, metadata: { id: metadataId } };
            } catch (err) {
                this.logger.error('Provider SQL retrieval error:', err);
                throw new BadGatewayException('Provider SQL retrieval error');
            }
        } else {
            try {
                data = await this.dataStorageService.retrieveFile(storageId, token, providerPrefix);

                returnedValue = {
                    data,
                    metadata: { id: metadataId },
                    data_model: 'columnsInfo',
                };
            } catch (err) {
                this.logger.error('Provider File retrieval error:', err);
                throw new BadGatewayException('Provider File retrieval error');
            }
        }
        return returnedValue;
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

    private async fetchColumns(storageId: string, token: string, providerPrefix: string, selectedColumns?: string[]) {
        const rawColumns = await this.dataStorageService.getColumns(storageId, token, providerPrefix);
        return rawColumns[0].data_model.columns
            .filter((col: any) => !selectedColumns?.length || selectedColumns.includes(col[0]))
            .map((col: any) => ({ name: col[0], dataType: col[1] }));
    }

    private async fetchRows(
        token: string,
        providerPrefix: string,
        storageId: string,
        offset: number | undefined,
        batchSize: number | undefined,
        columns: ColumnDto[],
    ) {
        const columnsForPagination: Record<string, null> = Object.fromEntries(
            columns.map((col: ColumnDto) => [col.name, null]),
        );

        const data = await this.dataStorageService.retrievePaginatedData(
            storageId,
            token,
            offset || 0,
            batchSize || 1000,
            columnsForPagination,
            providerPrefix,
        );

        return {
            data: data && 'data' in data ? data['data'] : { rows: [] },
            data_model: { columns },
        };
    }

    private async fetchRowsByDateRange(
        token: string,
        providerPrefix: string,
        storageId: string,
        dateRange: Record<string, any>,
        columns: ColumnDto[],
    ) {
        const result = await this.dataStorageService.retrieveSqlDataByDateRange(token, providerPrefix, {
            asset_uuid: storageId,
            column_name: dateRange['dateColumn'],
            column_datatype: 'date',
            start_date: dateRange['fromDate'],
            end_date: dateRange['toDate'],
        });

        return {
            data: result && 'data' in result ? result['data'] : { rows: [] },
            data_model: { columns },
        };
    }
}
