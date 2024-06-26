import { ForbiddenException } from '@nestjs/common';

import { ProviderService } from './provider.service';

describe('ProviderService', () => {
    let providerService: ProviderService;
    let dataStorageService: any;
    let blockchainService: any;
    let metadataRepositoryService: any;

    beforeEach(async () => {
        dataStorageService = {
            getColumns: jest.fn(),
            retrievePaginatedData: jest.fn(),
        };

        blockchainService = {
            isContractValid: jest.fn(),
            updateBlockchain: jest.fn(),
        };

        metadataRepositoryService = {
            retrieveMetadata: jest.fn(),
        };

        providerService = new ProviderService(dataStorageService, blockchainService, metadataRepositoryService);
    });

    it('should be defined', () => {
        expect(providerService).toBeDefined();
    });

    it('should throw ForbiddenException if contract is not valid', async () => {
        jest.spyOn(blockchainService, 'isContractValid').mockResolvedValue({ isValid: false });
        const paginationData = { offset: 0, batchSize: 10, columns: [] };
        await expect(providerService.downloadDataset('assetId', paginationData)).rejects.toThrow(ForbiddenException);
    });

    it('should retrieve paginated data and update blockchain', async () => {
        jest.spyOn(blockchainService, 'isContractValid').mockResolvedValue({ isValid: true });
        jest.spyOn(dataStorageService, 'getColumns').mockResolvedValue([{ name: 'column1' }]);
        jest.spyOn(metadataRepositoryService, 'retrieveMetadata').mockResolvedValue({ key: 'value' });
        jest.spyOn(dataStorageService, 'retrievePaginatedData').mockResolvedValue({ rows: [] });
        jest.spyOn(blockchainService, 'updateBlockchain').mockResolvedValue(null);

        const paginationData = { offset: 10, batchSize: 10, columns: [{ name: 'column1' }] };

        const result = await providerService.downloadDataset('assetId', paginationData as any);

        expect(dataStorageService.retrievePaginatedData).toHaveBeenCalledWith(
            'assetId',
            'token',
            paginationData.offset,
            paginationData.batchSize,
            { column1: null },
        );

        expect(blockchainService.updateBlockchain).toHaveBeenCalledWith(
            {
                assetId: 'assetId',
                consumerId: '123',
                providerId: '234',
                dateTime: '2024-04-15 00:00:00',
            },
            'token',
        );

        expect(result).toEqual({
            rows: [],
            metadata: {},
            data_model: [{ name: 'column1' }],
        });
    });
});
