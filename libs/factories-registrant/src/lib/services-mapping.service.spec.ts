import { NotFoundException } from '@nestjs/common';

import { CreateServiceMappingDTO } from './dto/create-service-mapping.dto';
import { UpdateServiceMappingDTO } from './dto/update-service-mapping.dto';
import { ServicesMappingService } from './services-mapping.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('ServicesMappingService', () => {
    let service: ServicesMappingService;
    let servicesMappingRepo: any;
    let factoriesRepo: any;

    beforeEach(async () => {
        servicesMappingRepo = {
            findOneOrFail: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: () => jest.fn(),
                flush: () => jest.fn(),
            }),
        };

        factoriesRepo = {
            findOneOrFail: jest.fn(),
        };
        service = new ServicesMappingService(servicesMappingRepo, factoriesRepo);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return all services for admin', async () => {
        const services = [{ id: '1' }, { id: '2' }];
        jest.spyOn(servicesMappingRepo, 'findAll').mockResolvedValue(services);

        expect(await service.findServicesMappingForAdmin()).toEqual(services);
    });

    it('should return services for general users', async () => {
        const services = [
            { serviceName: 'Service 1', serviceUrl: 'service-1' },
            { serviceName: 'Service 2', serviceUrl: 'service-2' },
        ];

        jest.spyOn(servicesMappingRepo, 'findAll').mockResolvedValue(services);

        const expectedResult = Object.fromEntries(
            services.map(({ serviceName, serviceUrl }) => [serviceName, serviceUrl]),
        );

        expect(await service.findServicesMappingForGeneralUsers()).toEqual(expectedResult);
    });

    it('should return a service', async () => {
        const returnedService = { id: '1' };
        jest.spyOn(servicesMappingRepo, 'findOneOrFail').mockResolvedValue(returnedService);

        expect(await service.find('1')).toEqual(returnedService);
    });

    it('should throw exception when finding a nonexistent service', async () => {
        servicesMappingRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        try {
            await service.find('abc');
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
        }
    });

    it('should find organization services', async () => {
        const factory = {
            id: '123',
            organizationId: '100',
            factoryPrefix: 'test-factory',
        };
        jest.spyOn(factoriesRepo, 'findOneOrFail').mockResolvedValue(factory);

        const organisationServices = [
            { serviceName: 'Service 1', serviceUrl: 'service-1' },
            { serviceName: 'Service 2', serviceUrl: 'service-2' },
        ];

        jest.spyOn(servicesMappingRepo, 'findAll').mockResolvedValue(organisationServices);

        const expectedResult = Object.fromEntries(
            organisationServices.map(({ serviceName, serviceUrl }) => [
                serviceName,
                `https://${factory.factoryPrefix}.pistis-market.eu/srv/${serviceUrl}`,
            ]),
        );

        expect(await service.findOrganizationServices('100')).toEqual(expectedResult);
        expect(factoriesRepo.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(servicesMappingRepo.findAll).toHaveBeenCalledTimes(1);
    });

    it('should throw exception when factory does not exist', async () => {
        factoriesRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        try {
            await service.findOrganizationServices('1');
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(factoriesRepo.findOneOrFail).toHaveBeenCalledTimes(1);
            expect(servicesMappingRepo.findAll).toHaveBeenCalledTimes(0);
        }
    });

    it('should create new service', async () => {
        const returnedService = {
            id: '1',
            serviceName: 'Service',
            serviceUrl: 'service-url',
        };

        const createDto: CreateServiceMappingDTO = {
            serviceName: 'Service',
            serviceUrl: 'service-url',
        };

        jest.spyOn(servicesMappingRepo, 'create').mockReturnValue(returnedService);
        jest.spyOn(servicesMappingRepo.getEntityManager(), 'persistAndFlush').mockImplementation();

        expect(await service.create(createDto)).toEqual(returnedService);
        expect(servicesMappingRepo.getEntityManager().persistAndFlush).toHaveBeenCalledTimes(1);

        expect(servicesMappingRepo.create).toHaveBeenCalledWith(createDto);
    });

    it('should update a service', async () => {
        const existingService = {
            id: '1',
            serviceName: 'Service',
            serviceUrl: 'service-url',
        };

        const updateDto: UpdateServiceMappingDTO = {
            serviceName: 'Service Changed',
            serviceUrl: 'service-url-changed',
        };

        const result = {
            id: '1',
            serviceName: updateDto.serviceName,
            serviceUrl: updateDto.serviceUrl,
        };

        jest.spyOn(servicesMappingRepo, 'findOneOrFail').mockReturnValue(existingService);
        jest.spyOn(servicesMappingRepo.getEntityManager(), 'flush').mockImplementation();

        expect(await service.update('1', updateDto)).toEqual(result);

        expect(servicesMappingRepo.getEntityManager().flush).toHaveBeenCalledTimes(1);
    });

    it('should thrown an exception when finding a non existing service', async () => {
        servicesMappingRepo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        const updateDto: UpdateServiceMappingDTO = {
            serviceName: 'Service Changed',
            serviceUrl: 'service-url-changed',
        };

        jest.spyOn(servicesMappingRepo.getEntityManager(), 'flush').mockImplementation();

        try {
            await service.update('1', updateDto);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(servicesMappingRepo.findOneOrFail).toHaveBeenCalledTimes(1);
            expect(servicesMappingRepo.getEntityManager().flush).toHaveBeenCalledTimes(0);
        }
    });
});
