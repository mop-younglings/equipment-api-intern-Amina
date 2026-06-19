import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccessControlService } from '../../../common/services/access-control.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Employee } from '../../employee/entities/employee.entity';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentAssignmentStatus } from '../../equipment-assignment/enums/equipment-assignment-status.enum';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestStatus } from '../../request/enums/request-status.enum';
import { RequestType } from '../../request/enums/request-type.enum';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApprovalRole } from '../enums/approval-role.enum';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';
import { ApprovalService } from './approval.service';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let approvalStepRepository: jest.Mocked<Repository<ApprovalStep>>;
  let requestRepository: jest.Mocked<Repository<EquipmentRequest>>;
  let assignmentRepository: jest.Mocked<Repository<EquipmentAssignment>>;
  let notificationService: jest.Mocked<NotificationService>;
  let accessControl: jest.Mocked<AccessControlService>;
  let dataSource: { transaction: jest.Mock };

  const managerId = 'manager-1';
  const procurementId = 'procurement-1';
  const requesterId = 'user-1';
  const stepId = 'step-1';
  const requestId = 'req-1';
  const modelId = 'model-1';
  const assetId = 'asset-1';

  const managerUser: AuthenticatedUser = {
    id: managerId,
    email: 'bob@example.com',
    role: EmployeeRole.DIRECT_MANAGER,
  };

  const procurementUser: AuthenticatedUser = {
    id: procurementId,
    email: 'pat@example.com',
    role: EmployeeRole.PROCUREMENT_MANAGER,
  };

  const otherUser: AuthenticatedUser = {
    id: 'other',
    email: 'other@example.com',
    role: EmployeeRole.EMPLOYEE,
  };

  const requester = {
    id: requesterId,
    firstName: 'Jane',
    lastName: 'Doe',
  } as Employee;

  const equipmentModel = {
    id: modelId,
    name: 'MacBook Pro',
  } as EquipmentModel;

  const buildStep = (overrides: Partial<ApprovalStep> = {}): ApprovalStep =>
    ({
      id: stepId,
      level: 1,
      status: ApprovalStepStatus.PENDING,
      approverRole: ApprovalRole.DIRECT_MANAGER,
      approver: { id: managerId } as Employee,
      request: {
        id: requestId,
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
        requestType: RequestType.LOAN,
        requester,
        equipmentModel,
        approvalSteps: [],
      } as EquipmentRequest,
      ...overrides,
    }) as ApprovalStep;

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        {
          provide: getRepositoryToken(ApprovalStep),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentRequest),
          useValue: { update: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentAsset),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentAssignment),
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: NotificationService,
          useValue: {
            notifyApprovalRequired: jest.fn(),
            notifyRequestApproved: jest.fn(),
            notifyRequestRejected: jest.fn(),
            notifyRequestUpdate: jest.fn(),
            notifyProcurementApproved: jest.fn(),
            notifyEquipmentAssigned: jest.fn(),
          },
        },
        {
          provide: AccessControlService,
          useValue: {
            isProcurementManagerOrAbove: jest.fn().mockReturnValue(false),
            findProcurementManager: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ApprovalService);
    approvalStepRepository = module.get(getRepositoryToken(ApprovalStep));
    requestRepository = module.get(getRepositoryToken(EquipmentRequest));
    assignmentRepository = module.get(getRepositoryToken(EquipmentAssignment));
    notificationService = module.get(NotificationService);
    accessControl = module.get(AccessControlService);
  });

  describe('findMyPending', () => {
    it('returns pending steps for the approver', async () => {
      const step = buildStep();
      approvalStepRepository.find.mockResolvedValue([step]);

      const result = await service.findMyPending(managerId);

      expect(result).toEqual([step]);
      expect(approvalStepRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            approver: { id: managerId },
            status: ApprovalStepStatus.PENDING,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws when step not found', async () => {
      approvalStepRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', managerUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when user cannot view step', async () => {
      approvalStepRepository.findOne.mockResolvedValue(buildStep());

      await expect(service.findOne(stepId, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('approve', () => {
    it('throws when user is not the designated approver', async () => {
      approvalStepRepository.findOne.mockResolvedValue(buildStep());

      await expect(service.approve(stepId, otherUser, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('creates procurement step after manager approval', async () => {
      const step = buildStep();
      approvalStepRepository.findOne.mockResolvedValue(step);
      accessControl.findProcurementManager.mockResolvedValue({
        id: procurementId,
      } as Employee);

      const updatedStep = { ...step, status: ApprovalStepStatus.APPROVED };
      const mockStepRepo = {
        findOneOrFail: jest
          .fn()
          .mockResolvedValueOnce(step)
          .mockResolvedValueOnce(updatedStep),
        save: jest.fn().mockImplementation(async (s) => s),
        create: jest.fn((data) => data),
      };
      const mockRequestRepo = { update: jest.fn() };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === ApprovalStep) return mockStepRepo;
              if (entity === EquipmentRequest) return mockRequestRepo;
              return {};
            },
          }),
      );

      requestRepository.findOne.mockResolvedValue({
        id: requestId,
        requester,
        equipmentModel,
        approvalSteps: [
          updatedStep,
          {
            approverRole: ApprovalRole.PROCUREMENT_MANAGER,
            status: ApprovalStepStatus.PENDING,
            approver: { id: procurementId },
          },
        ],
      } as EquipmentRequest);

      await service.approve(stepId, managerUser, { comment: 'Approved' });

      expect(mockRequestRepo.update).toHaveBeenCalledWith(requestId, {
        status: RequestStatus.PENDING_PROCUREMENT_APPROVAL,
      });
      expect(mockStepRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          approverRole: ApprovalRole.PROCUREMENT_MANAGER,
          status: ApprovalStepStatus.PENDING,
        }),
      );
      expect(notificationService.notifyApprovalRequired).toHaveBeenCalled();
    });

    it('fulfills loan request on procurement approval', async () => {
      const step = buildStep({
        approverRole: ApprovalRole.PROCUREMENT_MANAGER,
        approver: { id: procurementId } as Employee,
        level: 2,
      });
      approvalStepRepository.findOne.mockResolvedValue(step);

      const availableAsset = {
        id: assetId,
        status: EquipmentAssetStatus.AVAILABLE,
        equipmentModel,
      } as EquipmentAsset;

      const updatedStep = { ...step, status: ApprovalStepStatus.APPROVED };
      const savedAssignment = {
        id: 'assignment-1',
        status: EquipmentAssignmentStatus.ACTIVE,
      } as EquipmentAssignment;

      const mockStepRepo = {
        findOneOrFail: jest
          .fn()
          .mockResolvedValueOnce(step)
          .mockResolvedValueOnce(updatedStep),
        save: jest.fn().mockImplementation(async (s) => s),
      };
      const mockRequestRepo = { update: jest.fn() };
      const mockAssetRepo = {
        findOne: jest.fn().mockResolvedValue(availableAsset),
        save: jest.fn().mockImplementation(async (a) => a),
      };
      const mockAssignmentRepo = {
        create: jest.fn((data) => data),
        save: jest.fn().mockResolvedValue(savedAssignment),
      };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === ApprovalStep) return mockStepRepo;
              if (entity === EquipmentRequest) return mockRequestRepo;
              if (entity === EquipmentAsset) return mockAssetRepo;
              if (entity === EquipmentAssignment) return mockAssignmentRepo;
              return {};
            },
          }),
      );

      requestRepository.findOne.mockResolvedValue({
        id: requestId,
        requester,
        equipmentModel,
        requestType: RequestType.LOAN,
        status: RequestStatus.FULFILLED,
        approvalSteps: [updatedStep],
      } as EquipmentRequest);
      assignmentRepository.findOne.mockResolvedValue(savedAssignment);

      const result = await service.approve(stepId, procurementUser, {});

      expect(mockAssetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: EquipmentAssetStatus.IN_USE }),
      );
      expect(mockRequestRepo.update).toHaveBeenCalledWith(requestId, {
        status: RequestStatus.FULFILLED,
      });
      expect(notificationService.notifyEquipmentAssigned).toHaveBeenCalled();
      expect(result.status).toBe(ApprovalStepStatus.APPROVED);
    });
  });

  describe('reject', () => {
    it('throws when rejection reason is missing', () => {
      expect(() => service.reject(stepId, managerUser, {})).toThrow(
        BadRequestException,
      );
    });

    it('rejects request and skips remaining pending steps', async () => {
      const step = buildStep();
      approvalStepRepository.findOne.mockResolvedValue(step);

      const mockStepRepo = {
        findOneOrFail: jest
          .fn()
          .mockResolvedValueOnce(step)
          .mockResolvedValueOnce({
            ...step,
            status: ApprovalStepStatus.REJECTED,
          }),
        save: jest.fn().mockImplementation(async (s) => s),
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 'step-2', status: ApprovalStepStatus.PENDING },
          ]),
      };
      const mockRequestRepo = { update: jest.fn() };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === ApprovalStep) return mockStepRepo;
              if (entity === EquipmentRequest) return mockRequestRepo;
              return {};
            },
          }),
      );

      requestRepository.findOne.mockResolvedValue({
        id: requestId,
        requester,
        equipmentModel,
      } as EquipmentRequest);

      await service.reject(stepId, managerUser, { comment: 'Denied' });

      expect(mockRequestRepo.update).toHaveBeenCalledWith(requestId, {
        status: RequestStatus.REJECTED,
        rejectedReason: 'Denied',
      });
      expect(mockStepRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ApprovalStepStatus.SKIPPED }),
      );
      expect(notificationService.notifyRequestRejected).toHaveBeenCalled();
    });
  });

  describe('procurement approval for procurement request', () => {
    it('creates purchase order', async () => {
      const step = buildStep({
        approverRole: ApprovalRole.PROCUREMENT_MANAGER,
        approver: { id: procurementId } as Employee,
        level: 2,
        request: {
          id: requestId,
          requestType: RequestType.PROCUREMENT,
          requestedItemName: 'Desk',
          requester,
          quantity: 1,
        } as EquipmentRequest,
      });
      approvalStepRepository.findOne.mockResolvedValue(step);

      const mockStepRepo = {
        findOneOrFail: jest
          .fn()
          .mockResolvedValueOnce(step)
          .mockResolvedValueOnce({
            ...step,
            status: ApprovalStepStatus.APPROVED,
          }),
        save: jest.fn().mockImplementation(async (s) => s),
      };
      const mockRequestRepo = { update: jest.fn() };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === ApprovalStep) return mockStepRepo;
              if (entity === EquipmentRequest) return mockRequestRepo;
              return {};
            },
          }),
      );

      requestRepository.findOne.mockResolvedValue({
        id: requestId,
        requestType: RequestType.PROCUREMENT,
        requester,
      } as EquipmentRequest);

      await service.approve(stepId, procurementUser, {});
      expect(mockRequestRepo.update).toHaveBeenCalledWith(requestId, {
        status: RequestStatus.PROCUREMENT_APPROVED,
      });
      expect(notificationService.notifyProcurementApproved).toHaveBeenCalled();
    });
  });
});
