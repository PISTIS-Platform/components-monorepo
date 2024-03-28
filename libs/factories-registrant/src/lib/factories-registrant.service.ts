import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, wrap } from '@mikro-orm/postgresql';
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

        //TODO: call keycloak to retrieve info and save it in db
        //TODO: replace the above dummy data
        const jsonContent = [
            {
                clientId: 'Client 1',
                clientSecret: '1234',
            },
            {
                clientId: 'Client 2',
                clientSecret: '7890',
            },
        ];
        return jsonContent;
    }

    async acceptFactory(factoryId: string, data: boolean): Promise<{ message: string } | { error: string }> {
        const factory = await this.repo.findOneOrFail({ id: factoryId });
        factory.isAccepted = data;
        factory.status = 'live';
        this.repo.getEntityManager().flush();
        const notification = {
            userId: '', //FIXME:This will replaced with actual user id
            organizationId: factory.organizationId,
            type: data === true ? 'factory_accepted' : 'factory_denied',
            message: data === true ? 'New factory registration accepted' : 'New factory registration denied',
        };
        return firstValueFrom(
            this.httpService
                .post(`${this.NOTIFICATIONS_URL}/notifications`, notification, {
                    headers: getHeaders(''),
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

    async retrieveFactory(factoryId: string): Promise<FactoriesRegistrant> {
        return this.repo.findOneOrFail({ id: factoryId });
    }

    async updateFactoryStatus(factoryId: string, data: UpdateFactoryDTO): Promise<FactoriesRegistrant> {
        const factory = await this.repo.findOneOrFail({ id: factoryId });
        wrap(factory).assign(data);
        await this.repo.getEntityManager().flush();
        return factory;
    }

    async createFactory(data: CreateFactoryDTO, userId: string): Promise<FactoriesRegistrant> {
        const factory = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(factory);
        const notification = {
            userId,
            organizationId: data.organizationId, //This will replaced with actual organization id
            type: 'new_factory_registered',
            message: 'New factory registered',
        };
        await firstValueFrom(
            this.httpService
                .post(`${this.NOTIFICATIONS_URL}/notifications`, notification, {
                    headers: getHeaders(''),
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
