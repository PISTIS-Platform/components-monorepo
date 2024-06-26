import { ConsumerController } from './consumer.controller';

describe('ConsumerController', () => {
    let controller: ConsumerController;
    let service: any;

    beforeEach(async () => {
        service = {
            retrieveData: jest.fn(),
        };

        controller = new ConsumerController(service);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should retrieve data with correct parameters', async () => {
        const user = { id: 'user123' };
        const contractId = 'contract123';
        const assetId = 'asset123';

        const result = { data: 'some data' };
        jest.spyOn(service, 'retrieveData').mockResolvedValue(result);

        expect(await controller.retrieveData(user, contractId, assetId)).toBe(result);
    });
});
