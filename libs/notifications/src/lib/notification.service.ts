import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';

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
        const notification = this.repo.create(data);

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
