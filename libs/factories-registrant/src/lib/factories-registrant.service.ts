import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, Loaded } from '@mikro-orm/postgresql';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { catchError, firstValueFrom, lastValueFrom, map, of } from 'rxjs';

import { CreateFactoryDTO, UpdateFactoryDTO, UpdateFactoryIpDTO } from './dto';
import { ClientInfo } from './entities';
import { FactoriesRegistrant } from './entities/factories-registrant.entity';
import { MODULE_OPTIONS_TOKEN } from './factories-registrant.module-definition';
import { FactoryModuleOptions } from './factories-registrant-module-options.interface';
import { ServicesMappingService } from './services-mapping.service';

@Injectable()
export class FactoriesRegistrantService {
    private readonly logger = new Logger(FactoriesRegistrantService.name);

    constructor(
        @InjectRepository(FactoriesRegistrant)
        private readonly repo: EntityRepository<FactoriesRegistrant>,
        @InjectRepository(ClientInfo)
        private readonly clientRepo: EntityRepository<ClientInfo>,
        private readonly httpService: HttpService,
        private readonly servicesMappingService: ServicesMappingService,
        @Inject(MODULE_OPTIONS_TOKEN) private options: FactoryModuleOptions,
    ) {}

    async checkClient(organizationId: string) {
        // check if the information already exist in our database
        const client = await this.clientRepo.findOneOrFail({ organizationId: organizationId });

        //Prepare array of client credentials
        const clientCredentials: any[] = [];
        for (const clientId of client.clientsIds) {
            await firstValueFrom(
                this.httpService
                    .get(`${this.options.identityAccessManagementUrl}/factory/${clientId}`, {
                        headers: getHeaders(''),
                    })
                    .pipe(
                        //If not an error from call admin receive the message below
                        map(async (res) => {
                            clientCredentials.push({ clientId: res.data.clientId, clientSecret: res.data.secret });
                        }),
                        // Catch any error occurred during the client checking
                        catchError((error) => {
                            this.logger.error('Client retrieval error:', error);
                            return of({ error: 'Error occurred during client retrieval' });
                        }),
                    ),
            );
        }

        return clientCredentials;
    }

    async activateFactory(
        factoryId: string,
        token: string,
        userId: string,
    ): Promise<{ message: string } | { error: string }> {
        //Search db if factory exist
        const factory = await this.repo.findOneOrFail({ id: factoryId });

        //Adding check in case that factory not contains ip
        if (!factory.ip) {
            throw new BadRequestException(
                'It is not possible to update the status of the factory because the ip is missing',
            );
        }

        //Check the status of factory and throw error in case that status is not what we expect
        if (factory.status === 'pending' || factory.status === 'suspended') {
            factory.status = 'online';
        } else {
            throw new BadRequestException('It is not possible to update the status of the factory');
        }
        //Update factory status
        this.repo.getEntityManager().flush();

        //Create object of clients upon discovered services
        const keycloakClients = await this.clientRepo.findOneOrFail({ organizationId: factory.organizationId });
        //Enable clients in keycloak
        await lastValueFrom(
            of(keycloakClients.clientsIds).pipe(
                (client: Record<string, any>) =>
                    this.httpService.put(
                        `${this.options.identityAccessManagementUrl}/factory/${client}/enable`,
                        client,
                        {
                            headers: getHeaders(token),
                        },
                    ),
                catchError((error: any) => {
                    this.logger.error('Client activation error:', error);
                    return of({ error: 'Error occurred during Client activation' });
                }),
            ),
        );

        const notification = {
            userId: userId,
            organizationId: factory.organizationId,
            type: 'factory_activated',
            message: 'Factory activated',
        };
        return firstValueFrom(
            this.httpService
                .post(`${this.options.notificationsUrl}/notifications`, notification, {
                    headers: getHeaders(token),
                })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(() => {
                        return { message: 'Notification created' };
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Client activation error:', error);
                        return of({ error: 'Error occurred during Client activation' });
                    }),
                ),
        );
    }

    async suspendFactory(
        factoryId: string,
        token: string,
        userId: string,
    ): Promise<{ message: string } | { error: string }> {
        //Search db if factory exist
        const factory = await this.repo.findOneOrFail({ id: factoryId });

        //Change status and save it
        factory.status = 'suspended';
        this.repo.getEntityManager().flush();

        //Find all clients and disable them.
        const client = await this.clientRepo.findOneOrFail({ organizationId: factory.organizationId });

        await lastValueFrom(
            of(client.clientsIds).pipe(
                (client: Record<string, any>) =>
                    this.httpService.put(`${this.options.identityAccessManagementUrl}/factory/${client}/disable`, {
                        headers: getHeaders(token),
                    }),
                catchError((error: any) => {
                    this.logger.error('Client disable error:', error);
                    return of({ error: 'Error occurred during disabling client' });
                }),
            ),
        );

        const notification = {
            userId: userId,
            organizationId: factory.organizationId,
            type: 'factory_suspended',
            message: 'Factory suspended',
        };
        return firstValueFrom(
            this.httpService
                .post(`${this.options.notificationsUrl}/notifications`, notification, {
                    headers: getHeaders(token),
                })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(() => {
                        return { message: 'Notification created' };
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Notification creation error:', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );
        //TODO Call to identity manager to notify for new factory
    }

    async retrieveFactories(): Promise<FactoriesRegistrant[]> {
        return this.repo.findAll();
    }

    async retrieveAcceptedFactories() {
        const factories = await this.repo.find(
            {
                isAccepted: true,
            },
            {
                fields: ['factoryPrefix'],
            },
        );

        return factories.map(
            (factory: Loaded<FactoriesRegistrant, never, 'factoryPrefix', never>) =>
                `https://${factory.factoryPrefix}.pistis-market.eu`,
        );
    }

    async retrieveFactory(factoryId: string): Promise<FactoriesRegistrant> {
        return this.repo.findOneOrFail({ id: factoryId });
    }

    async updateFactory(
        data: UpdateFactoryDTO,
        token: string,
        factoryId: string,
        userId: string,
    ): Promise<FactoriesRegistrant> {
        const factory = await this.repo.findOneOrFail({ id: factoryId });
        factory.country = data.country;
        factory.factoryPrefix = data.factoryPrefix;
        factory.organizationId = data.organizationId;
        factory.organizationName = data.organizationName;
        factory.ip = data.ip;
        factory.status = data.status;
        await this.repo.getEntityManager().persistAndFlush(factory);
        const notification = {
            userId: userId,
            organizationId: factory.organizationId,
            type: data.status === 'online' ? 'factory_online' : 'factory_suspended',
            message: data.status === 'online' ? 'Factory activate' : 'Factory suspended',
        };
        await firstValueFrom(
            this.httpService
                .post(`${this.options.notificationsUrl}/notifications`, notification, {
                    headers: getHeaders(token),
                })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(() => {
                        return { message: 'Notification created' };
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Notification creation error:', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );
        return factory;
    }

    async createFactory(data: CreateFactoryDTO, token: string): Promise<FactoriesRegistrant> {
        const factory = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(factory);

        //Find all services that we need to create for factory
        const services = await this.servicesMappingService.findServicesMappingForAdmin();
        const clients = {
            clientsIds: services.map(({ serviceName }) => {
                {
                    return `${factory.organizationId}-${serviceName}`;
                }
            }),
            organizationId: factory.organizationId,
        };
        //Save in clients information
        const savedClients = this.clientRepo.create(clients);
        await this.clientRepo.getEntityManager().persistAndFlush(savedClients);

        //Create object of clients upon discovered services
        const keycloakClients = services.map(({ serviceName, serviceUrl }) => ({
            clientId: `${factory.organizationId}-${serviceName}`,
            name: factory.organizationName,
            description: factory.country,
            redirect: true,
            redirectUris: [`https://${factory.factoryPrefix}.pistis-market.eu/srv/${serviceUrl}`],
            webOrigins: ['*'],
        }));

        //Create clients in keycloak
        await lastValueFrom(
            of(keycloakClients).pipe(
                (client: Record<string, any>) =>
                    this.httpService.post(`${this.options.identityAccessManagementUrl}/factory`, client, {
                        headers: getHeaders(token),
                    }),
                catchError((error: any) => {
                    this.logger.error('Client creation error:', error);
                    return of({ error: 'Error occurred during Client creation' });
                }),
            ),
        );

        return factory;
    }

    async setFactoryIp(data: UpdateFactoryIpDTO, userOrganizationId: string): Promise<FactoriesRegistrant> {
        const factory = await this.repo.findOneOrFail({ organizationId: userOrganizationId });
        factory.ip = data.ip;
        await this.repo.getEntityManager().persistAndFlush(factory);

        return factory;
    }

    // @Cron('0 01 * * * *')
    async syncFactories() {
        dayjs.extend(isBetween);
        //TODO Add call to factories registration Service, below is a first assumption of the flow
        const factories = await this.retrieveFactories();
        factories.filter((factory: any) => {
            return dayjs(factory.createdAt).isBetween(dayjs(new Date()).subtract(1, 'hour'), dayjs(new Date()));
        });
        //TODO Add call to Data factory Backend in Data Factory for details
        //Notify Identity manager for changes
    }
}
