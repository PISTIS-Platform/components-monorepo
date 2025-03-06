import { Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '@pistis/data-storage';
import { MetadataRepositoryService } from '@pistis/metadata-repository';

import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class ProviderService {
    private readonly logger = new Logger(ProviderService.name);
    constructor(
        private readonly dataStorageService: DataStorageService,
        private readonly metadataRepositoryService: MetadataRepositoryService,
    ) { }


    async downloadDataset(assetId: string, paginationData: PaginationDto, token: string) {
        let data;
        let returnedValue;
        let metadata;

        let columnsInfo = paginationData.columns || [];
        try {
            metadata = await this.metadataRepositoryService.retrieveMetadata(assetId);
        } catch (err) {
            this.logger.error('Metadata retrieval error:', err);
            throw new Error(`Metadata retrieval error: ${err}`);
        }


        const metadataName = metadata.distributions[0].title.en;
        const storageId = metadata.distributions[0].access_url[0].split('=')[1]

        if (metadata.distributions[0].format.id.toUpperCase() === 'SQL') {
            try {
                // In case the consumer asked for columns and metadata
                // (if columns were not send in dto (during first retrieval), the provider needs to retrieve them below)

                if (columnsInfo.length === 0 && paginationData.offset === 0) {
                    columnsInfo = await this.dataStorageService.getColumns(storageId, token, paginationData.providerPrefix);
                }
                //transform this into the object needed for columns , for retrieving paginated data
                const columnsForPagination: Record<string, null> = Object.fromEntries(
                    columnsInfo[0].data_model.columns.map((column: any) => [column[0], null]
                    ),
                );

                //transform columns to send to consumer for table creation
                const columnsForNewTable: Record<string, null> = columnsInfo[0].data_model.columns.map((column: any) => {
                    const [name, dataType] = column;
                    return { name, dataType };
                }
                );

                //use data storage functions
                data = await this.dataStorageService.retrievePaginatedData(
                    storageId,
                    token,
                    paginationData.offset,
                    paginationData.batchSize,
                    columnsForPagination,
                    paginationData.providerPrefix
                );

                returnedValue = {
                    data: data,
                    metadata: { id: metadataName },
                    data_model: { columns: columnsForNewTable },
                }

            } catch (err) {
                this.logger.error('Provider SQL retrieval error:', err);
                throw new Error(`Provider SQL retrieval error: ${err}`);
            }


        } else {
            try {
                data = await this.dataStorageService.retrieveFile(storageId, token, paginationData.providerPrefix);

                returnedValue = {
                    data,
                    metadata: { id: metadataName },
                    data_model: "columnsInfo",
                }
            } catch (err) {
                this.logger.error('Provider File retrieval error:', err);
                throw new Error(`Provider File retrieval error: ${err}`);
            }

        }
        return returnedValue;
    }

}
