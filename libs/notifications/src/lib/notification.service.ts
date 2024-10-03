import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(Notification)
        private readonly repo: EntityRepository<Notification>,
    ) {}

    async create(data: CreateNotificationDto, userId: string): Promise<Notification> {
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
