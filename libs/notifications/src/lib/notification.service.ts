import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of, switchMap } from 'rxjs';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './notification.entity';
import { NOTIFICATIONS_MODULE_OPTIONS } from './notifications.module-definition';
import { NotificationsModuleOptions } from './notifications-module-options.interface';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(Notification)
        private readonly repo: EntityRepository<Notification>,
        private readonly httpService: HttpService,
        @Inject(NOTIFICATIONS_MODULE_OPTIONS) private options: NotificationsModuleOptions,
    ) {}

    async create(data: CreateNotificationDto): Promise<Notification> {
        let assetId = '';
        let buyerId = '';
        let sellerId = '';
        let assetName = '';
        let buyerName = '';
        let sellerName = '';
        const notificationData = { ...data };
        const message = data.message;
        const pattern = /ID:([a-f0-9-]+).*?Buyer:\s*([a-f0-9-]+).*?Seller:\s*([a-f0-9-]+)/i;
        const match = message.match(pattern);

        if (match) {
            assetId = match[1];
            buyerId = match[2];
            sellerId = match[3];
            const tokenData = {
                grant_type: 'client_credentials',
                client_id: this.options.clientId,
                client_secret: this.options.secret,
            };

            const transaction = await firstValueFrom(
                this.httpService
                    .post(`${this.options.authServerUrl}/realms/PISTIS/protocol/openid-connect/token`, tokenData, {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        data: tokenData,
                    })
                    .pipe(
                        map(({ data }) => data.access_token),
                        switchMap((access_token) =>
                            this.httpService.get(
                                `${this.options.transactionAuditorUrl}/srv/transactions-auditor/api/transactions-auditor/transaction/${buyerId}/${assetId}`,
                                { headers: getHeaders(access_token) },
                            ),
                        ),
                        map(async (res) => {
                            return res.data;
                        }),
                        catchError((error) => {
                            this.logger.error('Transaction retrieval error:', error);
                            return of({ error: 'Error occurred during transaction retrieval' });
                        }),
                    ),
            );

            if (transaction) {
                assetName = transaction.assetName;
                buyerName = transaction?.factoryBuyerName;
                sellerName = transaction?.factorySellerName;
                let newMessage = message
                    .replace(assetId, assetName)
                    .replace(buyerId, buyerName)
                    .replace(sellerId, sellerName);

                // Now, replace "Asset with ID:" with "Asset with title"
                newMessage = newMessage.replace('Asset with ID:', 'Asset with title ');
                notificationData.message = newMessage;
            }
        }
        const notification = this.repo.create(notificationData);

        await this.repo.getEntityManager().persistAndFlush(notification);

        return notification;
    }

    async findByUserId(userId: string): Promise<[Notification[], number]> {
        this.logger.warn(userId);
        return this.repo.findAndCount({ userId });
    }

    async countByUserId(userId: string): Promise<number> {
        return this.repo.count({ userId, isHidden: false, readAt: null });
    }

    async markAsRead(id: string, userId: string): Promise<void> {
        const notification = await this.repo.findOneOrFail({ id, userId });
        notification.readAt = new Date();
        this.repo.getEntityManager().flush();
    }

    async hide(id: string, userId: string): Promise<void> {
        const notification = await this.repo.findOneOrFail({ id, userId });
        notification.isHidden = true;
        return this.repo.getEntityManager().flush();
    }

    async refund(id: string, userId: string): Promise<void> {
        const notification = await this.repo.findOneOrFail({ id, userId });
        notification.readAt = new Date();
        //TODO: Add logic to communicate with Wallet and refund the amount
        return this.repo.getEntityManager().flush();
    }
}
