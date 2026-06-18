import { BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';

import { CreateFactoryDTO, UpdateFactoryDTO } from './dto';
import { FactoriesRegistrantService } from './factories-registrant.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('FactoriesRegistrantService', () => {
    let service: FactoriesRegistrantService;
    let httpService: any;
    let servicesMappingService: any;
    let repo: any;
    let clientRepo: any;
    let options: any;

    beforeEach(async () => {
        httpService = {
            get: jest.fn(),
            put: jest.fn(),
            post: jest.fn(),
            axiosRef: {
                get: jest.fn(),
            },
        };

        servicesMappingService = {
            findServicesMappingForAdmin: jest.fn(),
        };

        repo = {
            findOneOrFail: jest.fn(),
            findAll: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: () => jest.fn(),
                flush: () => jest.fn(),
            }),
        };

        clientRepo = {
            findOne: jest.fn(),
            findOneOrFail: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: () => jest.fn(),
                flush: () => jest.fn(),
            }),
        };

        options = {
            notificationsUrl: 'url1',
            identityAccessManagementUrl: 'url1',
            livenessTimeoutMs: 5000,
        };
        service = new FactoriesRegistrantService(repo, clientRepo, httpService, servicesMappingService, options);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return client info if it exists', async () => {
        const organizationId = 'org123';
        const client = { organizationId, clientsIds: ['client-1', 'client-2'] };
        jest.spyOn(clientRepo, 'findOneOrFail').mockResolvedValue(client);

        const response1 = {
            data: {
                clientId: 'client-1',
                secret: 'client-1-secret',
            },
        };
        const response2 = {
            data: {
                clientId: 'client-2',
                secret: 'client-2-secret',
            },
        };

        jest.spyOn(httpService, 'get')
            .mockImplementationOnce(() => of(response1))
            .mockImplementationOnce(() => of(response2));

        const result = await service.checkClient(organizationId, 'token');

        const expected = [
            { clientId: 'client-1', clientSecret: 'client-1-secret' },
            { clientId: 'client-2', clientSecret: 'client-2-secret' },
        ];
        expect(result).toEqual(expected);
    });

    it('should activate factory and send notifications', async () => {
        const factoryId = 'factory123';
        const factory = {
            id: factoryId,
            organizationId: 'org123',
            status: 'pending',
            ip: '127.0.0.1',
        };

        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'flush').mockImplementation();

        //client repo mocking
        const keycloakClients = {
            organizationId: factory.organizationId,
            clientsIds: ['client-1', 'client-2'],
        };
        jest.spyOn(clientRepo, 'findOneOrFail').mockResolvedValue(keycloakClients);

        //keycloak http service mocking
        jest.spyOn(httpService, 'put').mockReturnValue(of({}));

        //Notification mocking
        const httpPostResponse = { data: { message: 'Notification created' } };
        jest.spyOn(httpService, 'post').mockReturnValue(of(httpPostResponse) as any);

        const result = await service.activateFactory(factoryId, 'token', '123');
        expect(clientRepo.findOneOrFail).toHaveBeenCalledWith({ organizationId: factory.organizationId });
        expect(factory.status).toBe('online');
        expect(result).toEqual({ message: 'Notification created' });
    });

    it('should throw exception when activating a factory and the ip is missing', async () => {
        const factoryId = 'factory123';
        const factory = {
            organizationId: 'org123',
            status: 'pending',
        };

        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);

        try {
            await service.activateFactory(factoryId, 'token', '123');
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestException);
            expect((e as BadRequestException).message).toBe(
                'It is not possible to update the status of the factory because the ip is missing',
            );
        }
    });

    it('should throw exception when activating a factory and status was not pending or suspended', async () => {
        const factoryId = 'factory123';
        const factory = {
            organizationId: 'org123',
            status: 'online',
            ip: '127.0.0.1',
        };

        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);

        try {
            await service.activateFactory(factoryId, 'token', '123');
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestException);
            expect((e as BadRequestException).message).toBe('It is not possible to update the status of the factory');
        }
    });

    it('should suspend factory and send notifications', async () => {
        const factoryId = 'factory123';
        const factory = {
            id: factoryId,
            organizationId: 'org123',
            status: 'online',
            ip: '127.0.0.1',
        };

        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'flush').mockImplementation();

        //client repo mocking
        const keycloakClients = {
            organizationId: factory.organizationId,
            clientsIds: ['client-1', 'client-2'],
        };
        jest.spyOn(clientRepo, 'findOneOrFail').mockResolvedValue(keycloakClients);

        //keycloak http service mocking
        jest.spyOn(httpService, 'put').mockReturnValue(of({}));

        //Notification mocking
        const httpPostResponse = { data: { message: 'Notification created' } };
        jest.spyOn(httpService, 'post').mockReturnValue(of(httpPostResponse) as any);

        const result = await service.suspendFactory(factoryId, 'token', '123');
        expect(clientRepo.findOneOrFail).toHaveBeenCalledWith({ organizationId: factory.organizationId });
        expect(factory.status).toBe('suspended');
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

    it('should find logged in user factory', async () => {
        const factoryId = 'factory123';
        const factory = { id: factoryId, organizationId: '123' };
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);

        const result = await service.findLoggedInUserFactory(factory.organizationId);
        expect(repo.findOneOrFail).toHaveBeenCalledWith({ organizationId: factory.organizationId });

        expect(result).toEqual(factory);
    });

    it('should update a factory', async () => {
        const factoryId = 'factory123';
        const updateData: UpdateFactoryDTO = {
            organizationId: 'org123',
            organizationName: 'OrgName',
            factoryPrefix: 'org',
            country: 'Country',
            ip: '192.168.1.1',
            status: 'online',
        };
        const factory = { id: factoryId, status: 'pending' };
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();

        const httpPostResponse = { data: { message: 'Notification created' } };
        jest.spyOn(httpService, 'post').mockReturnValue(of(httpPostResponse) as any);

        const result = await service.updateFactory(updateData, 'token', factory.id, '123');
        const updatedFactory = {
            ...factory,
            ...updateData,
        };
        expect(result).toEqual(updatedFactory);
    });

    it('should create a new factory and send notifications', async () => {
        const createData: CreateFactoryDTO = {
            organizationId: 'org123',
            organizationName: 'OrgName',
            factoryPrefix: 'org',
            country: 'Country',
            ip: '192.168.1.1',
            status: 'pending',
            isAccepted: true,
            isActive: true,
        };
        const factory = { id: 'factory123', ...createData };

        const services = [
            { serviceName: 'service 1', serviceUrl: 'service1-url' },
            { serviceName: 'service 2', serviceUrl: 'service2-url' },
        ];
        jest.spyOn(servicesMappingService, 'findServicesMappingForAdmin').mockResolvedValue(services);

        //create factory mock
        jest.spyOn(repo, 'create').mockReturnValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();

        //http service mock
        jest.spyOn(httpService, 'post').mockReturnValue(of({}));

        //create clients mock
        jest.spyOn(clientRepo, 'create').mockReturnValue({} as any);
        jest.spyOn(clientRepo.getEntityManager(), 'persistAndFlush').mockImplementation();

        const token = 'token';
        const result = await service.createFactory(createData as any, token);
        expect(result).toEqual(factory);

        const clients = {
            clientsIds: services.map(({ serviceName }) => {
                {
                    return `${factory.organizationId}-${serviceName}`;
                }
            }),
            organizationId: factory.organizationId,
        };
        expect(clientRepo.create).toHaveBeenCalledWith(clients);
    });

    it('should set factory ip', async () => {
        const factory = {
            id: '123',
            organizationId: 'org123',
            organizationName: 'OrgName',
            factoryPrefix: 'org',
            country: 'Country',
            ip: null,
            status: 'online',
        };
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(factory as any);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();

        const updateData = { ip: '192.168.1.1' };
        const result = await service.setFactoryIp(updateData, factory.organizationId);
        
        const updatedFactory = {
            ...factory,
            ...updateData,
        };
        expect(result).toEqual(updatedFactory);
        expect(factory.ip).toBe(updateData.ip);
    });

    it('should return accepted factories', async () => {
        const factories = [
            { id: 'factory1', factoryPrefix: 'factory-1-prefix' },
            { id: 'factory2', factoryPrefix: 'factory-2-prefix' },
        ];
        jest.spyOn(repo, 'find').mockResolvedValue(factories);

        const result = factories.map(({ factoryPrefix }) => `https://${factoryPrefix}.pistis-market.eu`);

        expect(await service.retrieveAcceptedFactories()).toEqual(result);
    });

    it('should return a lean liveness projection for all factories', async () => {
        const lastSeenAt = new Date();
        const factories = [
            {
                id: 'factory1',
                organizationId: 'org1',
                factoryPrefix: 'prefix1',
                status: 'online',
                lastSeenAt,
                country: 'Greece',
            },
            {
                id: 'factory2',
                organizationId: 'org2',
                factoryPrefix: 'prefix2',
                status: 'offline',
                lastSeenAt: null,
                country: 'Greece',
            },
        ];
        jest.spyOn(repo, 'find').mockResolvedValue(factories as any);

        const result = await service.getFactoriesLiveness();
        // Only online/offline factories are queried; pending/suspended are excluded.
        expect(repo.find).toHaveBeenCalledWith({ status: { $in: ['online', 'offline'] } });
        expect(result).toEqual([
            { id: 'factory1', organizationId: 'org1', factoryPrefix: 'prefix1', status: 'online', lastSeenAt },
            { id: 'factory2', organizationId: 'org2', factoryPrefix: 'prefix2', status: 'offline', lastSeenAt: null },
        ]);
    });

    it('should mark a reachable factory online and set lastSeenAt, and an unreachable one offline', async () => {
        const onlineFactory = { factoryPrefix: 'alive', status: 'online', lastSeenAt: null };
        const offlineFactory = { factoryPrefix: 'dead', status: 'online', lastSeenAt: new Date('2020-01-01') };
        jest.spyOn(repo, 'findAll').mockResolvedValue([onlineFactory, offlineFactory] as any);
        jest.spyOn(repo.getEntityManager(), 'flush').mockImplementation();

        jest.spyOn(httpService.axiosRef, 'get').mockImplementation((url: any) => {
            if (url.includes('alive')) {
                return Promise.resolve({ status: 200 });
            }
            return Promise.reject(new Error('ECONNREFUSED'));
        });

        await service.syncFactories();

        expect(onlineFactory.status).toBe('online');
        expect(onlineFactory.lastSeenAt).toBeInstanceOf(Date);
        expect(offlineFactory.status).toBe('offline');
        // lastSeenAt is left untouched on failure
        expect(offlineFactory.lastSeenAt).toEqual(new Date('2020-01-01'));
    });

    it('should not probe factories in administrative states (pending / suspended)', async () => {
        const pendingFactory = { factoryPrefix: 'pending-one', status: 'pending', lastSeenAt: null };
        const suspendedFactory = { factoryPrefix: 'suspended-one', status: 'suspended', lastSeenAt: null };
        jest.spyOn(repo, 'findAll').mockResolvedValue([pendingFactory, suspendedFactory] as any);
        jest.spyOn(repo.getEntityManager(), 'flush').mockImplementation();
        const probeSpy = jest.spyOn(httpService.axiosRef, 'get');

        await service.syncFactories();

        expect(probeSpy).not.toHaveBeenCalled();
        expect(pendingFactory.status).toBe('pending');
        expect(suspendedFactory.status).toBe('suspended');
    });
});
