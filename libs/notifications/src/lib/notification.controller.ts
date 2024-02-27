import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationController {
    constructor(private readonly notificationsService: NotificationService) {}

    @Post()
    @ApiBody({ type: CreateNotificationDto })
    async create(@Body() data: CreateNotificationDto) {
        return this.notificationsService.create(data);
    }

    @Get('/user/:userId')
    async findNotifications(@Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string) {
        return this.notificationsService.findByUserId(userId);
    }

    @Patch('/:id/read')
    async updateStatus(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @Patch('/:id/hide')
    async updateAppearance(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.notificationsService.hide(id);
    }
}
