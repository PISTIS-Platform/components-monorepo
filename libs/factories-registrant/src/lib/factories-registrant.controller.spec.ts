import { StreamableFile } from '@nestjs/common';
import * as fs from 'fs';
import YAML from 'yaml';

import { CreateFactoryDTO, UpdateFactoryDTO } from './dto';
import { CreateServiceMappingDTO } from './dto/create-service-mapping.dto';
import { UpdateServiceMappingDTO } from './dto/update-service-mapping.dto';
import { RegisteredService } from './entities';
import { FactoriesRegistrant } from './entities/factories-registrant.entity';
import { FactoriesRegistrantController } from './factories-registrant.controller';

jest.mock('fs'); // Mock the fs module

describe('FactoriesRegistrantController', () => {
    let controller: FactoriesRegistrantController;
    let service: any;
    let servicesMappingService: any;
    const userInfo = { id: '123', organizationId: '456' };

    beforeEach(async () => {
        service = {
            retrieveFactories: jest.fn(),
            retrieveFactory: jest.fn(),
            updateFactory: jest.fn(),
            createFactory: jest.fn(),
            activateFactory: jest.fn(),
            suspendFactory: jest.fn(),
            checkClient: jest.fn(),
            retrieveAcceptedFactories: jest.fn(),
            findLoggedInUserFactory: jest.fn(),
            setFactoryIp: jest.fn(),
        };

        servicesMappingService = {
            findServicesMappingForAdmin: jest.fn(),
            findServicesMappingForGeneralUsers: jest.fn(),
            findOrganizationServices: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        };

        controller = new FactoriesRegistrantController(service, servicesMappingService);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return an array of factories', async () => {
        const result = [{ id: 'factory1' }, { id: 'factory2' }] as FactoriesRegistrant[];
        jest.spyOn(service, 'retrieveFactories').mockResolvedValue(result);

        expect(await controller.findFactories()).toBe(result);
    });

    it('should return a StreamableFile', () => {
        const mockRes = {
            setHeader: jest.fn(),
        } as any;

        const mockFile = {
            pipe: jest.fn(),
        };

        jest.spyOn(fs, 'createReadStream').mockReturnValue(mockFile as any);

        const result = controller.downloadSetUpInstructions(mockRes);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.txt"');
        expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should return keycloak clients as YAML', async () => {
        const mockRes = {
            setHeader: jest.fn(),
            send: jest.fn(),
        } as any;

        const clients = { clientsIds: ['client1', 'client2'] };
        jest.spyOn(service, 'checkClient').mockResolvedValue(clients);

        await controller.downloadKeycloakClients(mockRes, {
            id: '123',
            organizationId: '345',
        });

        expect(service.checkClient).toHaveBeenCalled();

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/yaml');
        expect(mockRes.setHeader).toHaveBeenCalledWith(
            'Content-Disposition',
            'attachment; filename=keycloak-clients.yaml',
        );

        expect(mockRes.send).toHaveBeenCalledWith(YAML.stringify(clients));
    });

    it('should return the logged in user factory', async () => {
        const factoryId = 'factory123';
        const factory = { id: factoryId } as FactoriesRegistrant;
        jest.spyOn(service, 'findLoggedInUserFactory').mockResolvedValue(factory);

        expect(
            await controller.findLoggedInUserFactory({
                id: '123',
                organizationId: '345',
            }),
        ).toBe(factory);
    });

    it('should set factory ip', async () => {
        const factoryId = 'factory123';
        const factory = { id: factoryId, ip: '127.0.0.1' };
        jest.spyOn(service, 'setFactoryIp').mockResolvedValue(factory);

        expect(
            await controller.setFactoryIp(
                {
                    id: '123',
                    organizationId: '345',
                },
                { ip: '127.0.0.1' },
            ),
        ).toBe(factory);
    });

    it('should return a factory by ID', async () => {
        const factoryId = 'factory123';
        const factory = { id: factoryId } as FactoriesRegistrant;
        jest.spyOn(service, 'retrieveFactory').mockResolvedValue(factory);

        expect(await controller.findFactoryInfo(factoryId)).toBe(factory);
    });

    it('should update the factory', async () => {
        const factoryId = 'factory123';
        const updateData: UpdateFactoryDTO = {
            organizationId: 'org123',
            organizationName: 'OrgName',
            factoryPrefix: 'org',
            country: 'Country',
            ip: '192.168.1.1',
            status: 'online',
        };
        const factory = { id: factoryId } as FactoriesRegistrant;
        jest.spyOn(service, 'updateFactory').mockResolvedValue(factory);

        expect(await controller.updateFactory(factoryId, userInfo, 'token', updateData)).toBe(factory);
    });

    it('should create a new factory', async () => {
        const createData: CreateFactoryDTO = {
            organizationId: 'org123',
            organizationName: 'OrgName',
            factoryPrefix: 'org',
            country: 'Country',
            ip: '192.168.1.1',
            status: 'pending',
            isAccepted: false,
            isActive: false,
        };
        const factory = { id: 'factory123', ...createData } as FactoriesRegistrant;
        jest.spyOn(service, 'createFactory').mockResolvedValue(factory);

        expect(await controller.createFactory('token', createData)).toBe(factory);
    });

    it('should activate a factory', async () => {
        const factoryId = 'factory123';
        const result = { message: 'Factory accepted' };
        jest.spyOn(service, 'activateFactory').mockResolvedValue(result);

        expect(await controller.activateFactory(factoryId, userInfo, 'token')).toBe(result);
    });

    it('should suspend a factory', async () => {
        const factoryId = 'factory123';
        const result = { message: 'Factory suspended' };
        jest.spyOn(service, 'suspendFactory').mockResolvedValue(result);

        expect(await controller.suspendFactory(factoryId, userInfo, 'token')).toBe(result);
    });

    it('should return accepted factories', async () => {
        const result = [{ id: 'factory1' }, { id: 'factory2' }] as FactoriesRegistrant[];
        jest.spyOn(service, 'retrieveAcceptedFactories').mockResolvedValue(result);

        expect(await controller.findAcceptedFactories()).toBe(result);
    });

    it('should return services for general users', async () => {
        const result = [{ id: 'service1' }, { id: 'service1' }] as RegisteredService[];
        jest.spyOn(servicesMappingService, 'findServicesMappingForGeneralUsers').mockResolvedValue(result);

        expect(await controller.findServicesMappingForGeneralUsers()).toBe(result);
    });

    it('should return services for admin', async () => {
        const result = [{ id: 'service1' }, { id: 'service1' }] as RegisteredService[];
        jest.spyOn(servicesMappingService, 'findServicesMappingForAdmin').mockResolvedValue(result);

        expect(await controller.findServicesMappingForAdmin()).toBe(result);
    });

    it('should return services for admin', async () => {
        const result = { id: '123' } as RegisteredService;
        jest.spyOn(servicesMappingService, 'find').mockResolvedValue(result);

        expect(await controller.findServiceMapping('123')).toBe(result);
    });

    it('should create new service', async () => {
        const createData: CreateServiceMappingDTO = {
            serviceName: 'Service Name',
            serviceUrl: 'service-url',
        };
        const service = { id: '123', ...createData } as RegisteredService;
        jest.spyOn(servicesMappingService, 'create').mockResolvedValue(service);

        expect(await controller.createServiceMapping(createData)).toBe(service);
    });

    it('should update a service', async () => {
        const updateData: UpdateServiceMappingDTO = {
            serviceName: 'Changed Service Name',
            serviceUrl: 'changed-service-url',
        };
        const service = { id: '123', ...updateData } as RegisteredService;
        jest.spyOn(servicesMappingService, 'update').mockResolvedValue(service);

        expect(await controller.updateServiceMapping('123', updateData)).toBe(service);
    });

    it('should return organization services', async () => {
        const result = [{ id: 'service1' }, { id: 'service1' }] as RegisteredService[];
        jest.spyOn(servicesMappingService, 'findOrganizationServices').mockResolvedValue(result);

        expect(await controller.findOrganisationServices('123')).toBe(result);
    });
});
