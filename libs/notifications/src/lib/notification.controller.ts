import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLE, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';

@Controller('notifications')
@ApiTags('notifications')
@ApiBearerAuth()
export class NotificationController {
    constructor(private readonly notificationsService: NotificationService) {}

    @Post()
    @Roles({ roles: [ADMIN_ROLE] }) // FIXME: We need a role for sending notifications
    @ApiBody({ type: CreateNotificationDto })
    async create(@Body() data: CreateNotificationDto): Promise<Notification> {
        return this.notificationsService.create(data);
    }

    @Get()
    async findNotifications(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ): Promise<[Notification[], number]> {
        return this.notificationsService.findByUserId(user.id);
    }

    @Patch('/:id/read')
    async updateStatus(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ): Promise<void> {
        return this.notificationsService.markAsRead(id, user.id);
    }

    @Patch('/:id/hide')
    async updateAppearance(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ): Promise<void> {
        return this.notificationsService.hide(id, user.id);
    }
}
