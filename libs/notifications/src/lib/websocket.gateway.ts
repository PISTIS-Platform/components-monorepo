import { forwardRef, Inject, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { Server, Socket } from 'socket.io';

import { WsAuthenticatedUser } from './decorators/ws-authenticated-user.decorator';
import { WsAuthGuard } from './guards/WsAuthGuard.guard';
import { NotificationService } from './notification.service';

@ApiBearerAuth()
@UseGuards(WsAuthGuard)
@WebSocketGateway()
export class Websocket implements OnGatewayDisconnect {
    private readonly logger = new Logger(Websocket.name);
    @WebSocketServer()
    server!: Server;

    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationsService: NotificationService,
    ) { }

    getRoomName(userId: string) {
        return `room-${userId}`;
    }

    sendNewMessage(userId: string, message: Record<string, any> | Record<string, any>[]) {
        this.server.to(this.getRoomName(userId)).emit('onMessage', message);
    }

    handleDisconnect(client: Socket) {
        this.logger.warn('Disconnected')
        console.log('Disconnected');
    }

    @SubscribeMessage('getAllNotifications')
    async getAllNotifications(
        @MessageBody() body: any,
        @ConnectedSocket() socket: Socket,
        @WsAuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
    ) {
        const userRoom = this.getRoomName(user.id);

        if (!socket.rooms.has(userRoom)) {
            socket.join(this.getRoomName(user.id));
        }

        const notifications = await this.notificationsService.findByUserId(user.id);

        this.sendNewMessage(user.id, notifications[0]);
    }

    @SubscribeMessage('markAsRead')
    async markAsRead(@MessageBody() body: any, @WsAuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo) {
        await this.notificationsService.markAsRead(body.notificationId, user.id);
    }

    @SubscribeMessage('hide')
    async hide(@MessageBody() body: any, @WsAuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo) {
        await this.notificationsService.hide(body.notificationId, user.id);
    }

    @SubscribeMessage('refund')
    async refund(@MessageBody() body: any, @WsAuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo) {
        await this.notificationsService.refund(body.notificationId, user.id);
    }
}
