import { ProviderController } from './provider.controller';

describe('ProviderController', () => {
    let controller: ProviderController;
    let service: any;

    beforeEach(async () => {
        service = {
            downloadDataset: jest.fn(),
        };

        controller = new ProviderController(service);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should call download dataset with correct parameters', async () => {
        const assetId = 'asset123';
        const result = { data: 'some data' };
        const paginationData = { offset: 0, batchSize: 10 };

        jest.spyOn(service, 'downloadDataset').mockResolvedValue(result);
        expect(await controller.downloadDataset(assetId, paginationData)).toBe(result);
    });
});
