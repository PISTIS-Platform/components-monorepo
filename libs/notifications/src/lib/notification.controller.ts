import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_ROLE, NOTIFICATION_CLIENT, ParseUserInfoPipe, UserInfo } from '@pistis/shared';
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
    @Roles({ roles: [ADMIN_ROLE, NOTIFICATION_CLIENT] })
    @ApiBody({ type: CreateNotificationDto })
    @ApiResponse({
        description: 'Notification',
        schema: {
            example: {
                id: '64b13177-9762-4aab-9e96-252fbfefeb88',
                userId: 'b023c6ed-e355-4903-a2d3-7fbe2ef751ea',
                organizationId: '3bbe83bb-8d39-4bfc-af3c-f03e8e60313a',
                type: 'new_contract',
                message: 'Test message',
                readAt: new Date(),
                isHidden: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    })
    @ApiUnauthorizedResponse()
    async create(@Body() data: CreateNotificationDto): Promise<Notification> {
        return this.notificationsService.create(data);
    }

    @Get()
    @ApiResponse({
        description: 'Notification',
        schema: {
            example: [
                {
                    id: '64b13177-9762-4aab-9e96-252fbfefeb88',
                    userId: 'b023c6ed-e355-4903-a2d3-7fbe2ef751ea',
                    organizationId: '3bbe83bb-8d39-4bfc-af3c-f03e8e60313a',
                    type: 'new_contract',
                    message: 'Test message',
                    readAt: new Date(),
                    isHidden: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        },
    })
    @ApiUnauthorizedResponse()
    async findNotifications(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ): Promise<[Notification[], number]> {
        return this.notificationsService.findByUserId(user.id);
    }

    @Patch('/:id/read')
    @ApiUnauthorizedResponse()
    async updateStatus(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ): Promise<void> {
        return this.notificationsService.markAsRead(id, user.id);
    }

    @Patch('/:id/hide')
    @ApiUnauthorizedResponse()
    async updateAppearance(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ): Promise<void> {
        return this.notificationsService.hide(id, user.id);
    }
}
