import { NotFoundException } from '@nestjs/common';

import { NotificationType } from './constants';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationService } from './notification.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('NotificationService', () => {
    let service: NotificationService;

    let repo: any;

    beforeEach(async () => {
        repo = {
            findOneOrFail: jest.fn(),
            create: jest.fn(),
            findAndCount: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                flush: () => jest.fn(),
                persistAndFlush: () => jest.fn(),
            }),
        };

        service = new NotificationService(repo);
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

        jest.spyOn(repo, 'create').mockResolvedValue(notification);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();

        expect(await service.create(createDto)).toEqual(notification);

        expect(repo.create).toHaveBeenCalledTimes(1);
        expect(repo.create).toHaveBeenCalledWith(createDto);
        expect(repo.getEntityManager().persistAndFlush).toHaveBeenCalledTimes(1);
    });

    it('should find and count user notifications with including read notifications', async () => {
        const userId = '123';
        const includeRead = true;

        const notifications = [{ id: '1' }, { id: '2' }];

        jest.spyOn(repo, 'findAndCount').mockResolvedValue([notifications, 2]);

        expect(await service.findByUserId(userId, includeRead)).toEqual([notifications, 2]);

        expect(repo.findAndCount).toHaveBeenCalledTimes(1);
        expect(repo.findAndCount).toHaveBeenCalledWith({ userId, readAt: undefined });
    });

    it('should find and count user notifications with not including read notifications', async () => {
        const userId = '123';
        const includeRead = false;

        const notifications = [{ id: '1' }, { id: '2' }];

        jest.spyOn(repo, 'findAndCount').mockResolvedValue([notifications, 2]);

        expect(await service.findByUserId(userId, includeRead)).toEqual([notifications, 2]);

        expect(repo.findAndCount).toHaveBeenCalledTimes(1);
        expect(repo.findAndCount).toHaveBeenCalledWith({ userId, readAt: null });
    });

    it('should mark notification as read', async () => {
        const notification = {
            id: '1',
            readAt: null,
        };

        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(notification);
        jest.spyOn(repo.getEntityManager(), 'flush').mockReturnValue(null);

        const result = await service.markAsRead('1', '123');
        expect(result).toEqual(null);
        expect(notification.readAt).toBeInstanceOf(Date);

        expect(repo.getEntityManager().flush).toHaveBeenCalledTimes(1);
    });

    it('should throw an exception when finding a nonexistent notification when trying to mark it as read', async () => {
        repo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        jest.spyOn(repo.getEntityManager(), 'flush').mockImplementation();

        try {
            await service.markAsRead('1', '123');
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(repo.getEntityManager().flush).toHaveBeenCalledTimes(0);
        }
    });

    it('should mark notification as hidden', async () => {
        const notification = {
            id: '1',
            isHidden: false,
        };

        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(notification);
        jest.spyOn(repo.getEntityManager(), 'flush').mockReturnValue(null);

        const result = await service.hide('1', '123');
        expect(result).toEqual(null);
        expect(notification.isHidden).toBe(true);

        expect(repo.getEntityManager().flush).toHaveBeenCalledTimes(1);
    });

    it('should throw an exception when finding a nonexistent notification when trying to hide it', async () => {
        repo.findOneOrFail.mockImplementation(() => {
            throw new NotFoundException();
        });

        jest.spyOn(repo.getEntityManager(), 'flush').mockImplementation();

        try {
            await service.hide('1', '123');
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundException);
            expect(repo.getEntityManager().flush).toHaveBeenCalledTimes(0);
        }
    });
});
