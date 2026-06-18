import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestType } from '../../request/enums/request-type.enum';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: jest.Mocked<Repository<Notification>>;

  const userId = 'user-1';
  const notificationId = 'notification-1';

  const recipient = {
    id: userId,
    firstName: 'Bob',
    lastName: 'Manager',
  } as Employee;

  const requester = {
    id: 'requester-1',
    firstName: 'John',
    lastName: 'Smith',
  } as Employee;

  const equipmentModel = {
    id: 'model-1',
    name: 'MacBook Pro',
  } as EquipmentModel;

  const request = {
    id: 'request-1',
    requestType: RequestType.LOAN,
    requester,
    equipmentModel,
  } as EquipmentRequest;

  const approvalStep = {
    id: 'step-1',
    level: 1,
  } as ApprovalStep;

  const assignment = {
    id: 'assignment-1',
    equipmentAsset: { equipmentModel },
  } as EquipmentAssignment;

  const mockNotification: Notification = {
    id: notificationId,
    recipient,
    type: NotificationType.APPROVAL_REQUIRED,
    title: 'Approval required: MacBook Pro',
    message:
      'John Smith submitted a loan request for MacBook Pro and needs your approval.',
    isRead: false,
    request,
    approvalStep,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(NotificationService);
    repository = module.get(getRepositoryToken(Notification));
  });

  describe('findAllForUser', () => {
    it('returns notifications for the recipient ordered by date', async () => {
      repository.find.mockResolvedValue([mockNotification]);

      const result = await service.findAllForUser(userId);

      expect(result).toEqual([mockNotification]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { recipient: { id: userId } },
        relations: {
          request: { equipmentModel: true, category: true },
          approvalStep: true,
          equipmentAssignment: { equipmentAsset: { equipmentModel: true } },
        },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('countUnreadForUser', () => {
    it('returns unread count', async () => {
      repository.count.mockResolvedValue(2);

      const result = await service.countUnreadForUser(userId);

      expect(result).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('marks an unread notification as read', async () => {
      repository.findOne.mockResolvedValue({ ...mockNotification });
      repository.save.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date('2024-01-02'),
      });

      const result = await service.markAsRead(notificationId, userId);

      expect(result.isRead).toBe(true);
      expect(repository.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when notification does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread notifications for the user', async () => {
      await service.markAllAsRead(userId);

      expect(repository.update).toHaveBeenCalledWith(
        { recipient: { id: userId }, isRead: false },
        expect.objectContaining({ isRead: true }),
      );
    });
  });

  describe('notifyApprovalRequired', () => {
    it('creates an approval-required notification', async () => {
      repository.create.mockReturnValue(mockNotification);
      repository.save.mockResolvedValue(mockNotification);

      const result = await service.notifyApprovalRequired(
        recipient,
        request,
        approvalStep,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.APPROVAL_REQUIRED,
          recipient,
          request,
          approvalStep,
        }),
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('notifyRequestRejected', () => {
    it('includes rejection reason in message', async () => {
      repository.create.mockImplementation((input) => input as Notification);
      repository.save.mockImplementation(async (n) => n);

      await service.notifyRequestRejected(requester, request, 'Budget cut');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.REQUEST_REJECTED,
        }),
      );
      const created = repository.create.mock.calls[0][0] as Notification;
      expect(created.message).toContain('Budget cut');
    });
  });

  describe('notifyEquipmentAssigned', () => {
    it('links assignment to notification', async () => {
      repository.create.mockImplementation((input) => input as Notification);
      repository.save.mockImplementation(async (n) => n);

      await service.notifyEquipmentAssigned(requester, request, assignment);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.EQUIPMENT_ASSIGNED,
          equipmentAssignment: assignment,
        }),
      );
    });
  });

  describe('other notification helpers', () => {
    beforeEach(() => {
      repository.create.mockImplementation((input) => input as Notification);
      repository.save.mockImplementation(async (n) => n);
    });

    it('notifyRequestCancelled', async () => {
      await service.notifyRequestCancelled(requester, request);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.REQUEST_CANCELLED }),
      );
    });

    it('notifyProcurementApproved', async () => {
      await service.notifyProcurementApproved(requester, request);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.PROCUREMENT_APPROVED,
        }),
      );
    });

    it('notifyEquipmentReturnRequested', async () => {
      await service.notifyEquipmentReturnRequested(
        requester,
        assignment,
        '2026-08-01',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.EQUIPMENT_RETURN_REQUESTED,
        }),
      );
    });

    it('notifyEquipmentReturned', async () => {
      await service.notifyEquipmentReturned(requester, assignment);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.EQUIPMENT_RETURNED }),
      );
    });
  });
});
