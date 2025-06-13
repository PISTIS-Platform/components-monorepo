import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '@pistis/data-storage';
import { MetadataRepositoryService } from '@pistis/metadata-repository';

import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class ProviderService {
    private readonly logger = new Logger(ProviderService.name);
    constructor(
        private readonly dataStorageService: DataStorageService,
        private readonly metadataRepositoryService: MetadataRepositoryService,
    ) {}

    async getAllAssets() {
        return 'ok';
    }

    async downloadDataset(assetId: string, paginationData: PaginationDto, token: string) {
        let data;
        let returnedValue;
        let metadata;

        let columnsInfo = paginationData.columns || [];
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

                if (columnsInfo.length === 0 && paginationData.offset === 0) {
                    columnsInfo = await this.dataStorageService.getColumns(
                        storageId[0],
                        token,
                        paginationData.providerPrefix,
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
                    paginationData.offset || 0,
                    paginationData.batchSize || 1000,
                    columnsForPagination,
                    paginationData.providerPrefix,
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
        } else {
            try {
                data = await this.dataStorageService.retrieveFile(storageId, token, paginationData.providerPrefix);

                returnedValue = {
                    data,
                    metadata: { id: metadataName },
                    data_model: 'columnsInfo',
                };
            } catch (err) {
                this.logger.error('Provider File retrieval error:', err);
                throw new BadGatewayException('Provider File retrieval error');
            }
        }
        return returnedValue;
    }
}
