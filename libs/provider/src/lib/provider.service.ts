import { ForbiddenException, Injectable } from '@nestjs/common';
import { BlockchainService } from '@pistis/blockchain';
import { Column, DataStorageService } from '@pistis/data-storage';
import { MetadataRepositoryService } from '@pistis/metadata-repository';

import { ColumnDto, PaginationDto } from './dto/pagination.dto';

@Injectable()
export class ProviderService {
    constructor(
        private readonly dataStorageService: DataStorageService,
        private readonly blockchainService: BlockchainService,
        private readonly metadataRepositoryService: MetadataRepositoryService,
    ) {}

    //TODO:: check what parameters blockchain should get for contract validation
    async contractValidation(assetId: string) {
        return await this.blockchainService.isContractValid(assetId, '');
    }

    async downloadDataset(assetId: string, paginationData: PaginationDto) {
        const contract = await this.contractValidation(assetId);

        //TODO:: maybe change this if according to what info the contract will contain
        if (!contract.isValid) {
            throw new ForbiddenException('Contract is not valid, you cannot download the data from this asset');
        }

        let columnsInfo: Column[] = paginationData.columns || [];
        let metadata: Record<string, any> = {};

        // In case the consumer asked for columns and metadata
        // (if columns were not send in dto (during first retrieval), the provider needs to retrieve them below)
        if (!columnsInfo.length && paginationData.offset === 0) {
            columnsInfo = await this.dataStorageService.getColumns(assetId);
            metadata = await this.metadataRepositoryService.retrieveMetadata(assetId);
        }

        //transform this into the object needed for columns , for retrieving paginated data
        const columnsForPagination: Record<string, null> = Object.fromEntries(
            columnsInfo.map((column: ColumnDto) => [column.name, null]),
        );

        //use data storage functions
        //FIXME: check that this will work with actual assetId (and check if token will be needed)
        const data = await this.dataStorageService.retrievePaginatedData(
            assetId,
            'token',
            paginationData.offset,
            paginationData.batchSize,
            columnsForPagination,
        );

        //FIXME: Send any necessary params depending on what Blockchain needs (consumer id, transaction date etc..)
        await this.blockchainService.updateBlockchain(
            {
                assetId,
                consumerId: '123',
                providerId: '234',
                dateTime: '2024-04-15 00:00:00',
            },
            'token',
        );

        return {
            ...data,
            metadata,
            data_model: columnsInfo,
        };
    }
}
