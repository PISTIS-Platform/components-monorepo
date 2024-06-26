import { of } from 'rxjs';

import { ConsumerService } from './consumer.service';

describe('ConsumerService', () => {
    let service: ConsumerService;
    let httpService: any;
    let repo: any;
    let dataStorageService: any;
    let options: any;

    beforeEach(async () => {
        httpService = {
            get: jest.fn(),
            post: jest.fn(),
        };

        repo = {
            findOne: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                flush: jest.fn(),
            }),
        };

        dataStorageService = {
            createTableInStorage: jest.fn(),
            updateTableInStorage: jest.fn(),
        };

        options = {
            dataStorageUrl: '',
            factoryRegistryUrl: '',
            downloadBatchSize: 100,
            notificationsUrl: '',
        };

        service = new ConsumerService(httpService, repo, dataStorageService, options);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should retrieve data and store it correctly', async () => {
        const contractId = 'contract123';
        const assetId = 'asset123';
        const userId = 'user123';
        const token = 'token';
        const providerFactory = { ip: '192.168.1.1' };
        const results = { data: { rows: [] }, columns: [] };
        const storeResult = { assetUUID: 'uuid123', version_id: 'v1' };
        const notificationResponse = { message: 'Notification created' };

        jest.spyOn(httpService, 'get').mockReturnValue(of({ data: providerFactory }));
        jest.spyOn(httpService, 'post').mockReturnValueOnce(of({ data: results }));
        jest.spyOn(httpService, 'post').mockReturnValueOnce(of(notificationResponse));
        jest.spyOn(repo, 'findOne').mockResolvedValue(null);
        jest.spyOn(repo, 'create').mockReturnValue({});
        jest.spyOn(dataStorageService, 'createTableInStorage').mockResolvedValue(storeResult);

        const result = await service.retrieveData(contractId, assetId, userId, token);

        expect(result).toEqual(notificationResponse);
        expect(repo.create).toHaveBeenCalledWith({
            id: storeResult.assetUUID,
            cloudAssetId: assetId,
            version: storeResult.version_id,
            offset: 0,
        });
    });

    it('should retrieve data from provider', async () => {
        const bodyObject = { offset: 0, batchSize: 100 };
        const providerUrl = '';
        const assetId = 'asset123';
        const results = { data: { rows: [] }, columns: [] };

        jest.spyOn(httpService, 'post').mockReturnValue(of({ data: results }));

        const result = await service.getDataFromProvider(bodyObject, providerUrl, assetId);

        expect(result).toEqual(results);
    });
});
