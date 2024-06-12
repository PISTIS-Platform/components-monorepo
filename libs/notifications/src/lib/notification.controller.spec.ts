import { NotificationType } from './constants';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationController } from './notification.controller';

describe('NotificationController', () => {
    let controller: NotificationController;
    let notificationsService: any;

    beforeEach(async () => {
        notificationsService = {
            create: () => jest.fn(),
            findByUserId: () => jest.fn(),
            markAsRead: () => jest.fn(),
            hide: () => jest.fn(),
        };

        controller = new NotificationController(notificationsService);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should create a notification', async () => {
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

        jest.spyOn(notificationsService, 'create').mockResolvedValue(notification);
        expect(await controller.create(createDto)).toBe(notification);

        expect(notificationsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should find notification for user', async () => {
        const notifications = [{ id: '1' }, { id: '2' }];
        jest.spyOn(notificationsService, 'findByUserId').mockResolvedValue(notifications);

        expect(await controller.findNotifications({ id: '123' })).toBe(notifications);

        expect(notificationsService.findByUserId).toHaveBeenCalledWith('123');
    });

    it('should update read status for notification', async () => {
        jest.spyOn(notificationsService, 'markAsRead').mockResolvedValue(null);

        expect(await controller.updateStatus({ id: '123' }, '1')).toBe(null);

        expect(notificationsService.markAsRead).toHaveBeenCalledWith('1', '123');
    });

    it('should update appearance status for notification', async () => {
        jest.spyOn(notificationsService, 'hide').mockResolvedValue(null);

        expect(await controller.updateAppearance({ id: '123' }, '1')).toBe(null);

        expect(notificationsService.hide).toHaveBeenCalledWith('1', '123');
    });
});
