import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, Loaded } from '@mikro-orm/postgresql';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { catchError, firstValueFrom, lastValueFrom, map, mergeMap, of, toArray } from 'rxjs';

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
    ) { }



    async checkClient(organizationId: string, token: string) {
        // check if the information already exist in our database
        const client = await this.clientRepo.findOneOrFail({ organizationId: organizationId });

        //Prepare array of client credentials
        const clientCredentials: any[] = [];
        for (const clientId of client.clientsIds) {
            await firstValueFrom(
                this.httpService
                    .get(`${this.options.identityAccessManagementUrl}/factory/${clientId}`, {
                        headers: getHeaders(token),
                    })
                    .pipe(
                        //If not an error from call admin receive the message below
                        map(async (res) => {
                            clientCredentials.push({ clientId: res.data.clientId, clientSecret: res.data.secret });
                        }),
                        // Catch any error occurred during the client checking
                        catchError((error) => {
                            this.logger.error('Client retrieval error:', error);
                            throw error;
                        }),
                    ),
            );
        }

        return clientCredentials;
    }

    async getClientsSecret(organizationId: string) {
        // check if the information already exist in our database
        const { clientsIds } = await this.clientRepo.findOneOrFail({ organizationId: organizationId });
        const services = await this.servicesMappingService.findServicesMappingForAdmin();

        const data: Record<string, string> = clientsIds.reduce((data, client) => {
            const [id, secret] = JSON.parse(client);
            const [_, serviceId] = id.split('--');
            const service = services.find((service) => service.id === serviceId);
            if (!service) return data;

            const prefix =
                service.serviceUrl === '/'
                    ? 'FACTORY_UI'
                    : service.serviceUrl.replace('/srv/', '').replace(/-/g, '_').toUpperCase();

            data[`${prefix}_ID`] = id;
            data[`${prefix}_SECRET`] = secret;

            return data;
        }, {} as Record<string, string>);

        return {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: 'keycloak-clients-secret',
                namespace: 'default',
            },
            stringData: data,
            type: 'Opaque',
        };
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
    }

    async retrieveFactories(): Promise<FactoriesRegistrant[]> {
        return this.repo.findAll();
    }

    async retrieveAcceptedFactories() {
        const factories = await this.repo.find(
            {
                status: 'online',
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

    async findLoggedInUserFactory(organizationId: string): Promise<FactoriesRegistrant> {
        return this.repo.findOneOrFail({ organizationId });
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
        await this.recreateClients(token, factory.organizationId)
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
        await this.recreateClients(token, factory.organizationId);

        return factory;
    }

    async setFactoryIp(data: UpdateFactoryIpDTO, userOrganizationId: string): Promise<FactoriesRegistrant> {
        const factory = await this.repo.findOneOrFail({ organizationId: userOrganizationId });
        factory.ip = data.ip;
        await this.repo.getEntityManager().persistAndFlush(factory);

        return factory;
    }

    async recreateClients(token: string, organizationId: string) {
        dayjs.extend(isSameOrBefore);
        dayjs.extend(isSameOrAfter);
        //Find all services
        const services = await this.servicesMappingService.findServicesMappingForAdmin();
        //Find factory
        const factory = await this.repo.findOne({ organizationId });
        //Retrieve client
        const client = await this.clientRepo.findOne({ organizationId });
        let clientServices: string[] = [];
        let createdClients: string[] = [];
        let newClients: any[] = [];
        let updatedClients: any[] = [];

        //If client is undefined then we create the clients in keycloak and in DB
        if (!client) {
            //Create object of clients upon discovered services
            newClients = services.map(({ id, serviceUrl, serviceName, sar }) => ({
                clientId: `${factory?.organizationId}--${id}`,
                name: `${factory?.organizationName}: ${serviceName}`,
                description: `${factory?.organizationName}: ${serviceName}`,
                redirect: true,
                'service-account': {
                    enabled: sar,
                    roles: ['SRV_NOTIFICATION'],
                },
                redirectUris: [`https://${factory?.factoryPrefix}.pistis-market.eu${serviceUrl}/*`],
                webOrigins: ['*'],
            }));

            //Create clients in keycloak
            createdClients = await this.keycloakClients(newClients, token, 'post');
            //Create and save new clients in db
            const savedClients = this.clientRepo.create({
                clientsIds: createdClients,
                organizationId: organizationId,
            });
            await this.clientRepo.getEntityManager().persistAndFlush(savedClients);
        } else {
            //If exist in DB we take the services Id's from clients
            clientServices = client.clientsIds.map((client) => client.split('--')[1]);
            //Filter services to create clients
            const servicesToCreate = services.filter((service) => !clientServices.includes(service.id));
            //Filter services to update clients
            const servicesToUpdate = services.filter(
                (service) =>
                    clientServices.includes(service.id) && dayjs(client.updatedAt).isSameOrBefore(service.updatedAt) || dayjs(factory?.updatedAt).isSameOrAfter(client.updatedAt),
            );

            for (const service of servicesToCreate) {
                //We create the payload for keycloak
                updatedClients = [
                    {
                        clientId: `${factory?.organizationId}--${service.id}`,
                        name: `${factory?.organizationName}: ${service.serviceName}`,
                        description: `${factory?.organizationName}: ${service.serviceName}`,
                        redirect: true,
                        'service-account': {
                            enabled: service.sar,
                            roles: ['SRV_NOTIFICATION'],
                        },
                        redirectUris: [`https://${factory?.factoryPrefix}.pistis-market.eu${service.serviceUrl}/*`],
                        webOrigins: ['*'],
                    },
                ];
                //Call the function to create the new client in keycloak
                createdClients = await this.keycloakClients(updatedClients, token, 'post');
                client.clientsIds.push(`${organizationId}--${service.id}`);
                //Save new clients
                await this.clientRepo.getEntityManager().persistAndFlush(client);
                return;
            }

            for (const service of servicesToUpdate) {
                //We create the payload for keycloak
                updatedClients = [
                    {
                        clientId: `${factory?.organizationId}--${service.id}`,
                        name: `${factory?.organizationName}: ${service.serviceName}`,
                        description: `${factory?.organizationName}: ${service.serviceName}`,
                        redirect: true,
                        'service-account': {
                            enabled: service.sar,
                            roles: ['SRV_NOTIFICATION'],
                        },
                        redirectUris: [`https://${factory?.factoryPrefix}.pistis-market.eu${service.serviceUrl}/*`],
                        webOrigins: ['*'],
                    },
                ];

                //Call the function to create the new client in keycloak
                createdClients = await this.keycloakClients(updatedClients, token, 'patch');
                //Update client
                await this.clientRepo.getEntityManager().persistAndFlush(client);
                return;
            }
        }
        return createdClients;
    }

    async deleteFactory(token: string, factoryId: string, userId: string) {
        const factory = await this.repo.findOneOrFail({ id: factoryId });
        await this.deleteClients(token, factory.organizationId)
        await this.clientRepo.getEntityManager().removeAndFlush(factory);
        const notification = {
            userId,
            organizationId: factory.organizationId,
            type: 'delete_factory',
            message: 'Factory deleted',
        };
        await firstValueFrom(
            this.httpService
                .post(`${this.options.notificationsUrl}/notifications`, notification, {
                    headers: getHeaders(token),
                })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(() => {
                        return { message: 'Factory deleted' };
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Notification creation error:', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );

    }

    private async deleteClients(token: string, organizationId: string) {
        const client = await this.clientRepo.findOneOrFail({ organizationId });
        await firstValueFrom(
            of(client.clientsIds).pipe(
                // Create client
                mergeMap((client: any) =>
                    this.httpService.request({
                        method: 'delete',
                        url: `${this.options.identityAccessManagementUrl}/factory/${client}`,
                        headers: getHeaders(token),
                    }),
                ),
                // Extract data part of response
                map((res) => res),
                catchError((error: any) => {
                    this.logger.error('Client creation error:', error);
                    throw error;
                }),
            ),
        );
        return await this.clientRepo.getEntityManager().removeAndFlush(client);
    }

    private async keycloakClients(keycloakClients: any, token: string, method: 'post' | 'patch') {
        //Create clients in keycloak
        return await firstValueFrom(
            of(...keycloakClients).pipe(
                // Create client
                mergeMap((client: any) =>
                    this.httpService.request({
                        method,
                        //Change url calculation because patch needs every clientId in url  
                        url: method === 'post' ? `${this.options.identityAccessManagementUrl}/factory` : `${this.options.identityAccessManagementUrl}/factory/${client.clientId}`,
                        data: client,
                        headers: getHeaders(token),
                    }),
                ),
                // Extract data part of response
                map((res) => res.data),
                // Pick clientId and clientSecret and serialize them so it can be stored in database
                map(({ clientId, secret }) => JSON.stringify([clientId, secret])),
                // Collect responses from all clients into an array
                toArray(),
                catchError((error: any) => {
                    this.logger.error('Client creation error:', error);
                    throw error;
                }),
            ),
        );
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
