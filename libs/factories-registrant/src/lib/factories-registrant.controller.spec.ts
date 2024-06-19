import { StreamableFile } from '@nestjs/common';

import { CreateFactoryDTO, UpdateFactoryDTO } from './dto';
import { FactoriesRegistrant } from './entities/factories-registrant.entity';
import { FactoriesRegistrantController } from './factories-registrant.controller';

describe('FactoriesRegistrantController', () => {
    let controller: FactoriesRegistrantController;
    let service: any;

    beforeEach(async () => {
        service = {
            retrieveFactories: jest.fn(),
            retrieveFactory: jest.fn(),
            updateFactoryStatus: jest.fn(),
            createFactory: jest.fn(),
            acceptFactory: jest.fn(),
            checkClient: jest.fn(),
        };

        controller = new FactoriesRegistrantController(service);
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
        const res = {
            set: jest.fn(),
        } as any;

        const result = controller.downloadSetUpInstructions(res);

        expect(res.set).toHaveBeenCalledWith({
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="test.txt"',
        });
        expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should return keycloak clients as JSON', async () => {
        const res = {
            setHeader: jest.fn(),
            send: jest.fn(),
        } as any;

        const clients = { clientsIds: ['client1', 'client2'] };
        jest.spyOn(service, 'checkClient').mockResolvedValue(clients);

        await controller.downloadKeycloakClients(res);

        expect(service.checkClient).toHaveBeenCalled();
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=keycloak-clients.json');
        expect(res.send).toHaveBeenCalledWith(JSON.stringify(clients));
    });

    it('should return a factory by ID', async () => {
        const factoryId = 'factory123';
        const factory = { id: factoryId } as FactoriesRegistrant;
        jest.spyOn(service, 'retrieveFactory').mockResolvedValue(factory);

        expect(await controller.findFactoryInfo(factoryId)).toBe(factory);
    });

    it('should update the factory status', async () => {
        const factoryId = 'factory123';
        const updateData: UpdateFactoryDTO = { status: 'inactive', isAccepted: true, isActive: true };
        const factory = { id: factoryId, status: 'inactive' } as FactoriesRegistrant;
        jest.spyOn(service, 'updateFactoryStatus').mockResolvedValue(factory);

        expect(await controller.updateFactoryStatus(factoryId, updateData)).toBe(factory);
    });

    it('should create a new factory', async () => {
        const createData: CreateFactoryDTO = {
            organizationId: 'org123',
            organizationName: 'OrgName',
            country: 'Country',
            ip: '192.168.1.1',
            isAccepted: true,
            status: 'live',
            isActive: true,
        };
        const user = { id: 'user123' };
        const factory = { id: 'factory123', ...createData } as FactoriesRegistrant;
        jest.spyOn(service, 'createFactory').mockResolvedValue(factory);

        expect(await controller.createFactory(user, createData)).toBe(factory);
    });

    it('should accept a factory', async () => {
        const factoryId = 'factory123';
        const result = { message: 'Factory accepted' };
        jest.spyOn(service, 'acceptFactory').mockResolvedValue(result);

        expect(await controller.acceptFactory(factoryId)).toBe(result);
    });

    it('should deny a factory', async () => {
        const factoryId = 'factory123';
        const result = { message: 'Factory denied' };
        jest.spyOn(service, 'acceptFactory').mockResolvedValue(result);

        expect(await controller.denyFactory(factoryId)).toBe(result);
    });
});
