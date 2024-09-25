import { NotFoundException } from '@nestjs/common';

import { NotificationType } from './constants';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

jest.mock('./websocket.gateway', () => {
    // will work and let you check for constructor calls:
    return jest.fn().mockImplementation(function () {
        return {
            sendNewMessage: () => jest.fn(),
            getAllNotifications: () => jest.fn(),
        };
    });
});

describe('NotificationService', () => {
    let service: NotificationService;

    let em: any;
    let websocket: any;

    beforeEach(async () => {
        em = {
            fork: jest.fn().mockReturnValue({
                create: () => jest.fn(),
                persistAndFlush: () => jest.fn(),
                flush: () => jest.fn(),
                findOneOrFail: () => jest.fn(),
                findAndCount: () => jest.fn(),
            }),
        };

        websocket = {
            sendNewMessage: () => jest.fn(),
            getAllNotifications: () => jest.fn(),
            handleDisconnect: () => jest.fn(),
            getRoomName: () => jest.fn(),
            markAsRead: () => jest.fn(),
            hide: () => jest.fn(),
            updateUserNotifications: () => jest.fn(),
        };

        service = new NotificationService(em, websocket);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create notification', async () => {
        const createDto: CreateNotificationDto = {
            userId: '123',
            organizationId: '789',
            type: NotificationType.AcceptedFactory,
            message: 'Test message',
            isHidden: false,
        };

        const notification = {
            id: '1',
            ...createDto,
        };

        jest.spyOn(em.fork(), 'create').mockResolvedValue(notification);
        jest.spyOn(em.fork(), 'persistAndFlush').mockImplementation();

        expect(await service.create(createDto, '123')).toEqual(notification);

        expect(em.fork().create).toHaveBeenCalledTimes(1);
        expect(em.fork().create).toHaveBeenCalledWith(Notification, createDto);
        expect(em.fork().persistAndFlush).toHaveBeenCalledTimes(1);
    });

    it('should find and count user notifications', async () => {
        const userId = '123';

        const notifications = [{ id: '1' }, { id: '2' }];

        jest.spyOn(em.fork(), 'findAndCount').mockResolvedValue([notifications, 2]);

        expect(await service.findByUserId(userId)).toEqual([notifications, 2]);

        expect(em.fork().findAndCount).toHaveBeenCalledTimes(1);
        expect(em.fork().findAndCount).toHaveBeenCalledWith(Notification, { userId });
    });

    it('should mark notification as read', async () => {
        const notification = {
            id: '1',
            readAt: null,
        };

        jest.spyOn(em.fork(), 'findOneOrFail').mockResolvedValue(notification);
        jest.spyOn(em.fork(), 'flush').mockReturnValue(null);

        const result = await service.markAsRead('1', '123');
        expect(result).toEqual(null);
        expect(notification.readAt).toBeInstanceOf(Date);

        expect(em.fork().findOneOrFail).toHaveBeenCalledTimes(1);
        expect(em.fork().flush).toHaveBeenCalledTimes(1);
    });

    it('should throw an exception when finding a nonexistent notification when trying to mark it as read', async () => {
        jest.spyOn(em.fork(), 'findOneOrFail').mockImplementation(() => {
            throw new NotFoundException();
        });
        jest.spyOn(em.fork(), 'flush').mockImplementation();

        try {
            await service.markAsRead('1', '123');
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(em.fork().flush).toHaveBeenCalledTimes(0);
        }
    });

    it('should mark notification as hidden', async () => {
        const notification = {
            id: '1',
            isHidden: false,
        };

        jest.spyOn(em.fork(), 'findOneOrFail').mockResolvedValue(notification);
        jest.spyOn(em.fork(), 'flush').mockReturnValue(null);

        const result = await service.hide('1', '123');
        expect(result).toEqual(null);
        expect(notification.isHidden).toBe(true);

        expect(em.fork().flush).toHaveBeenCalledTimes(1);
    });

    it('should throw an exception when finding a nonexistent notification when trying to hide it', async () => {
        jest.spyOn(em.fork(), 'findOneOrFail').mockImplementation(() => {
            throw new NotFoundException();
        });
        jest.spyOn(em.fork(), 'flush').mockImplementation();

        try {
            await service.hide('1', '123');
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(em.fork().flush).toHaveBeenCalledTimes(0);
        }
    });
});
