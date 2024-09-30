import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateServiceMappingDTO } from './dto/create-service-mapping.dto';
import { UpdateServiceMappingDTO } from './dto/update-service-mapping.dto';
import { FactoriesRegistrant, RegisteredService } from './entities';

@Injectable()
export class ServicesMappingService {
    constructor(
        @InjectRepository(RegisteredService)
        private readonly servicesMappingRepo: EntityRepository<RegisteredService>,
        @InjectRepository(FactoriesRegistrant)
        private readonly factoriesRepo: EntityRepository<FactoriesRegistrant>,
    ) { }

    async findServicesMappingForAdmin(): Promise<RegisteredService[]> {
        return this.servicesMappingRepo.findAll();
    }

    async findServicesMappingForGeneralUsers() {
        const services = await this.findServicesMappingForAdmin();

        return Object.fromEntries(
            services.map(({ serviceName, serviceUrl }: RegisteredService) => [serviceName, serviceUrl]),
        );
    }

    async find(id: string) {
        const service = await this.servicesMappingRepo.findOne({ id });

        if (!service) {
            throw new NotFoundException(`Service with id: ${id} not found`)
        }
        return service;
    }

    async findOrganizationServices(organizationId: string) {
        const factory = await this.factoriesRepo.findOneOrFail({ organizationId });

        const organisationServices = await this.findServicesMappingForAdmin();

        return Object.fromEntries(
            organisationServices.map(({ serviceName, serviceUrl }: RegisteredService) => [
                serviceName,
                `https://${factory.factoryPrefix}.pistis-market.eu${serviceUrl}`,
            ]),
        );
    }

    async create(data: CreateServiceMappingDTO) {
        const serviceMapping = this.servicesMappingRepo.create(data);
        await this.servicesMappingRepo.getEntityManager().persistAndFlush(serviceMapping);

        return serviceMapping;
    }

    async update(id: string, data: UpdateServiceMappingDTO) {
        const serviceMapping: RegisteredService = await this.servicesMappingRepo.findOneOrFail({ id });

        if (data.serviceName) serviceMapping.serviceName = data.serviceName;
        if (data.serviceUrl) serviceMapping.serviceUrl = data.serviceUrl;
        if (data.sar) serviceMapping.sar = data.sar;

        await this.servicesMappingRepo.getEntityManager().flush();

        return serviceMapping;
    }
}
