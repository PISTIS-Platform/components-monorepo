import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, Loaded, wrap } from '@mikro-orm/postgresql';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { CreateFactoryDTO, UpdateFactoryDTO } from './dto';
import { ClientInfo } from './entities';
import { FactoriesRegistrant } from './entities/factories-registrant.entity';

@Injectable()
export class FactoriesRegistrantService {
    private readonly logger = new Logger(FactoriesRegistrantService.name);
    private readonly NOTIFICATIONS_URL = 'http://localhost:3001/api';
    private readonly KEYCLOAK_URL = 'https://iam.pistis.isi.gr/api/v1/factory';
    constructor(
        @InjectRepository(FactoriesRegistrant)
        private readonly repo: EntityRepository<FactoriesRegistrant>,
        @InjectRepository(ClientInfo)
        private readonly clientRepo: EntityRepository<ClientInfo>,
        private readonly httpService: HttpService,
    ) {}

    async checkClient(organizationId: string) {
        // check if the information already exist in our database
        const client = await this.clientRepo.findOne({ organizationId: organizationId });

        // return clients info if it exists and do not proceed further
        if (client) {
            return client?.clientsIds;
        }

        return await firstValueFrom(
            this.httpService
                .get(`${this.KEYCLOAK_URL}/${organizationId}`, {
                    headers: getHeaders(''),
                })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(async (res) => {
                        return res.data;
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Notification creation error:', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );
    }

    async acceptFactory(
        factoryId: string,
        data: boolean,
        token: string,
    ): Promise<{ message: string } | { error: string }> {
        const factory = await this.repo.findOneOrFail({ id: factoryId });
        factory.isAccepted = data;
        this.repo.getEntityManager().flush();
        const notification = {
            userId: '', //FIXME:This will replaced with actual user id
            organizationId: factory.organizationId,
            type: data === true ? 'factory_accepted' : 'factory_denied',
            message: data === true ? 'New factory registration accepted' : 'New factory registration denied',
        };
        const acceptance = data === true ? 'enable' : 'disable';
        await firstValueFrom(
            this.httpService
                .put(
                    `${this.KEYCLOAK_URL}/${factory.organizationId}/${acceptance}`,
                    {},
                    {
                        headers: getHeaders(token),
                    },
                )
                .pipe(
                    //If not an error from call admin receive the message below
                    map(async (res) => {
                        return res.data;
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Notification creation error:', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );
        return firstValueFrom(
            this.httpService
                .post(`${this.NOTIFICATIONS_URL}/notifications`, notification, {
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

    async updateFactoryStatus(factoryId: string, data: UpdateFactoryDTO): Promise<FactoriesRegistrant> {
        const factory = await this.repo.findOneOrFail({ id: factoryId });
        wrap(factory).assign(data);
        await this.repo.getEntityManager().flush();
        return factory;
    }

    async createFactory(data: CreateFactoryDTO, userId: string, token: string): Promise<FactoriesRegistrant> {
        const factory = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(factory);
        const factoryKeycloak = {
            clientId: data.organizationId,
            name: data.organizationName,
            description: data.country, //FIXME: Do we need something specific in description?
            redirect: true, //TODO: Is there any that we need to send false in redirect?
            redirectUris: [
                'http://localhost:8080', //FIXME: We add this url according to name of factory e.g. s5.pistis.eu?
            ],
            webOrigins: ['*'],
        };
        const notification = {
            userId,
            organizationId: data.organizationId, //This will replaced with actual organization id
            type: 'new_factory_registered',
            message: 'New factory registered',
        };
        const newFactory = await firstValueFrom(
            this.httpService
                .post(`${this.KEYCLOAK_URL}/`, factoryKeycloak, {
                    headers: getHeaders(token),
                })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(async (res) => {
                        return res.data;
                    }),
                    // Catch any error occurred during the notification creation
                    catchError((error) => {
                        this.logger.error('Notification creation error:', error);
                        return of({ error: 'Error occurred during notification creation' });
                    }),
                ),
        );
        await this.clientRepo.create({
            clientsIds: [newFactory.id],
            organizationId: factory.organizationId,
        });
        await firstValueFrom(
            this.httpService
                .post(`${this.NOTIFICATIONS_URL}/notifications`, notification, {
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
