import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';
import { NotificationController } from './notification.controller';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { ConfigurableModuleClass } from './notifications.module-definition';

@Module({
    imports: [MikroOrmModule.forFeature([Notification]), TerminusModule, HttpModule],
    controllers: [NotificationController, ComponentHealthController],
    providers: [NotificationService],
})
export class NotificationsModule extends ConfigurableModuleClass {}
