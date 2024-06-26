import { of } from 'rxjs';

import { DataStorageService } from './data-storage.service';

describe('ConsumerService', () => {
    let service: DataStorageService;
    let httpService: any;
    let options: any;

    beforeEach(async () => {
        httpService = {
            get: jest.fn(),
            post: jest.fn(),
        };

        options = {
            dataStorageUrl: '',
            factoryRegistryUrl: '',
            downloadBatchSize: 100,
            notificationsUrl: '',
        };

        service = new DataStorageService(httpService, options);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should update table in storage', async () => {
        const token = 'some_token';
        const assetId = 'asset123';
        const results = {};

        jest.spyOn(httpService, 'post').mockReturnValue(of({ data: results }));

        const result = await service.updateTableInStorage(assetId, results, token);

        expect(result).toEqual(results);
    });

    it('should create table in storage', async () => {
        const token = 'some_token';
        const results = {};

        jest.spyOn(httpService, 'post').mockReturnValue(of({ data: results }));

        const result = await service.createTableInStorage(results, token);

        expect(result).toEqual(results);
    });

    it('should retrieve columns from storage', async () => {
        const uuid = 'some_uuid';
        const results = {};

        jest.spyOn(httpService, 'post').mockReturnValue(of({ data: results }));

        const result = await service.getColumns(uuid);

        expect(result).toBeUndefined();
    });

    it('should count rows of an asset from storage', async () => {
        const id = 'some_id';
        const token = 'some_token';
        const response = { data: { 'Number of rows': 100 } };

        jest.spyOn(httpService, 'get').mockReturnValue(of(response));

        const result = await service.countRows(id, token);

        expect(result).toBe(100);
    });

    it('should retrieve paginated data from storage', async () => {
        const assetUUID = 'assetUUID';
        const token = 'token';
        const offset = 0;
        const limit = 10;
        const columnsForPagination = { column1: null };
        const response = { data: { Data: ['row1', 'row2'] } };

        jest.spyOn(httpService, 'post').mockReturnValue(of(response));

        const result = await service.retrievePaginatedData(assetUUID, token, offset, limit, columnsForPagination);

        expect(result.data.rows).toEqual({ data: { rows: response.data.Data } });
    });
});
