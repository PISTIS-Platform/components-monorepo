import { of } from 'rxjs';

import { CreateFactoryDTO, UpdateFactoryDTO } from './dto';
import { FactoriesRegistrantService } from './factories-registrant.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('FactoriesRegistrantService', () => {
    let service: FactoriesRegistrantService;
    let httpService: any;
    let repo: any;
    let clientRepo: any;

    beforeEach(async () => {
        httpService = {
            get: jest.fn(),
            put: jest.fn(),
            post: jest.fn(),
        };

        repo = {
            findOneOrFail: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: () => jest.fn(),
                flush: () => jest.fn(),
            }),
        };

        clientRepo = {
            findOne: jest.fn(),
            create: jest.fn(),
        };
        service = new FactoriesRegistrantService(repo, clientRepo, httpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return client info if it exists', async () => {
        const organizationId = 'org123';
        const client = { organizationId, clientsIds: ['client123'] };
        jest.spyOn(clientRepo, 'findOne').mockResolvedValue(client as any);

        const result = await service.checkClient(organizationId);
        expect(result).toEqual(client.clientsIds);
    });

    it('should call Keycloak API if client does not exist', async () => {
        const organizationId = 'org123';
        jest.spyOn(clientRepo, 'findOne').mockResolvedValue(null);
        const response = { data: { clientsIds: ['client123'] } };
        jest.spyOn(httpService, 'get').mockReturnValue(of(response) as any);

        const result = await service.checkClient(organizationId);
        expect(result).toEqual(response.data);
    });

    it('should accept factory and send notifications', async () => {
        const factoryId = 'factory123';
        const factory = { id: factoryId, organizationId: 'org123', isAccepted: false, status: 'pending' };
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'flush').mockImplementation();
        const httpPutResponse = { data: { success: true } };
        const httpPostResponse = { data: { message: 'Notification created' } };
        jest.spyOn(httpService, 'put').mockReturnValue(of(httpPutResponse) as any);
        jest.spyOn(httpService, 'post').mockReturnValue(of(httpPostResponse) as any);

        const result = await service.acceptFactory(factoryId, true);
        expect(factory.isAccepted).toBe(true);
        expect(factory.status).toBe('live');
        expect(result).toEqual({ message: 'Notification created' });
    });

    it('should return all factories', async () => {
        const factories = [{ id: 'factory1' }, { id: 'factory2' }];
        jest.spyOn(repo, 'findAll').mockResolvedValue(factories as any);

        const result = await service.retrieveFactories();
        expect(result).toEqual(factories);
    });

    it('should return a factory by ID', async () => {
        const factoryId = 'factory123';
        const factory = { id: factoryId };
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);

        const result = await service.retrieveFactory(factoryId);
        expect(result).toEqual(factory);
    });

    it('should update factory status', async () => {
        const factoryId = 'factory123';
        const updateData: UpdateFactoryDTO = { status: 'inactive', isAccepted: true, isActive: true };
        const factory = { id: factoryId, status: 'live' };
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();

        const result = await service.updateFactoryStatus(factoryId, updateData);
        expect(factory.status).toBe(updateData.status);
        expect(result).toEqual(factory);
    });

    it('should create a new factory and send notifications', async () => {
        const createData: CreateFactoryDTO = {
            organizationId: 'org123',
            organizationName: 'OrgName',
            country: 'Country',
            ip: '192.168.1.1',
            isAccepted: true,
            status: '',
            isActive: true,
        };
        const userId = 'user123';
        const factory = { id: 'factory123', ...createData };
        jest.spyOn(repo, 'create').mockReturnValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();
        const httpPostResponse = { data: { id: 'keycloak123' } };
        jest.spyOn(httpService, 'post').mockReturnValue(of(httpPostResponse) as any);
        jest.spyOn(clientRepo, 'create').mockReturnValue({} as any);

        const result = await service.createFactory(createData, userId);
        expect(result).toEqual(factory);
    });
});
