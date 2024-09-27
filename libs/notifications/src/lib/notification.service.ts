import { EntityManager } from '@mikro-orm/core';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './notification.entity';
import { Websocket } from './websocket.gateway';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private readonly em: EntityManager,
        @Inject(forwardRef(() => Websocket)) private readonly gateway: Websocket,
    ) { }

    async create(data: CreateNotificationDto, userId: string): Promise<Notification> {
        const emFork = this.em.fork();
        const notification = emFork.create(Notification, data);
        await emFork.persistAndFlush(notification);

        this.gateway.sendNewMessage(userId, notification);

        return notification;
    }

    async findByUserId(userId: string): Promise<[Notification[], number]> {
        this.logger.warn(userId);
        const emFork = this.em.fork();
        return emFork.findAndCount(Notification, { userId });
    }

    async markAsRead(id: string, userId: string): Promise<void> {
        const emFork = this.em.fork();
        const notification = await emFork.findOneOrFail(Notification, { id, userId });
        notification.readAt = new Date();
        return emFork.flush();
    }

    async hide(id: string, userId: string): Promise<void> {
        const emFork = this.em.fork();
        const notification = await emFork.findOneOrFail(Notification, { id, userId });
        notification.isHidden = true;
        return emFork.flush();
    }

    async refund(id: string, userId: string): Promise<void> {
        const emFork = this.em.fork();
        const notification = await emFork.findOneOrFail(Notification, { id, userId });
        notification.readAt = new Date();
        //TODO: Add logic to communicate with Wallet and refund the amount 
        return emFork.flush();
    }
}
