import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';
import { NotificationController } from './notification.controller';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';

@Module({
    imports: [MikroOrmModule.forFeature([Notification]), TerminusModule],
    controllers: [NotificationController, ComponentHealthController],
    providers: [NotificationService],
})
export class NotificationsModule {}
