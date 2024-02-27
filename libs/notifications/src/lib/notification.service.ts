import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(@InjectRepository(Notification) private readonly repo: EntityRepository<Notification>) {}

    async create(data: CreateNotificationDto): Promise<Notification> {
        const notification = this.repo.create(data);
        await this.repo.getEntityManager().persistAndFlush(notification);
        return notification;
    }

    async findByUserId(userId: string, includeRead = true): Promise<[Notification[], number]> {
        return this.repo.findAndCount({ userId, readAt: includeRead ? undefined : null });
    }

    async markAsRead(id: string): Promise<void> {
        const notification = await this.repo.findOneOrFail({ id });
        notification.readAt = new Date();
        return this.repo.getEntityManager().flush();
    }

    async hide(id: string): Promise<void> {
        const notification = await this.repo.findOneOrFail({ id });
        notification.isHidden = true;
        return this.repo.getEntityManager().flush();
    }
}
