import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { NotificationController } from './notification.controller';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationService } from '../services/notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: jest.Mocked<NotificationService>;

  const user = {
    id: 'user-1',
    email: 'bob@example.com',
    role: EmployeeRole.EMPLOYEE,
  };

  const mockNotification = {
    id: 'notification-1',
    type: NotificationType.APPROVAL_REQUIRED,
    isRead: false,
  } as Notification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            findAllForUser: jest.fn(),
            countUnreadForUser: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(NotificationController);
    service = module.get(NotificationService);
  });

  it('delegates findAll to service', async () => {
    service.findAllForUser.mockResolvedValue([mockNotification]);

    const result = await controller.findAll(user);

    expect(result).toEqual([mockNotification]);
    expect(service.findAllForUser).toHaveBeenCalledWith(user.id);
  });

  it('returns unread count', async () => {
    service.countUnreadForUser.mockResolvedValue(3);

    const result = await controller.unreadCount(user);

    expect(result).toEqual({ count: 3 });
  });

  it('delegates markAsRead to service', async () => {
    service.markAsRead.mockResolvedValue({
      ...mockNotification,
      isRead: true,
    });

    const result = await controller.markAsRead('notification-1', user);

    expect(result.isRead).toBe(true);
    expect(service.markAsRead).toHaveBeenCalledWith('notification-1', user.id);
  });

  it('delegates markAllAsRead to service', async () => {
    await controller.markAllAsRead(user);

    expect(service.markAllAsRead).toHaveBeenCalledWith(user.id);
  });
});
