import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { NotificationController } from './notification.controller';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { Websocket } from './websocket.gateway';

@Module({
    imports: [MikroOrmModule.forFeature([Notification])],
    controllers: [NotificationController],
    providers: [NotificationService, Websocket],
})
export class NotificationsModule {}
