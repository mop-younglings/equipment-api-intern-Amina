import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { Employee } from '../../employee/entities/employee.entity';
import { Equipment } from '../../equipment/entities/equipment.entity';
import { EquipmentStatus } from '../../equipment/enums/equipment-status.enum';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestStatus } from '../../request/enums/request-status.enum';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';
import { ApprovalService } from './approval.service';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let approvalStepRepository: jest.Mocked<Repository<ApprovalStep>>;
  let dataSource: { transaction: jest.Mock };

  const managerId = 'manager-1';
  const adminId = 'admin-1';
  const requesterId = 'user-1';
  const stepId = 'step-1';
  const requestId = 'req-1';
  const equipmentId = 'equipment-1';

  const managerUser: AuthenticatedUser = {
    id: managerId,
    email: 'bob@example.com',
    role: EmployeeRole.USER,
  };

  const otherUser: AuthenticatedUser = {
    id: 'other',
    email: 'other@example.com',
    role: EmployeeRole.USER,
  };

  const requester = {
    id: requesterId,
  } as Employee;

  const equipment = {
    id: equipmentId,
    status: EquipmentStatus.AVAILABLE,
  } as Equipment;

  const buildStep = (overrides: Partial<ApprovalStep> = {}): ApprovalStep =>
    ({
      id: stepId,
      level: 1,
      status: ApprovalStepStatus.PENDING,
      approver: { id: managerId } as Employee,
      request: {
        id: requestId,
        status: RequestStatus.PENDING,
        requester,
        equipment,
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
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneOrFail: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EquipmentRequest),
          useValue: { save: jest.fn(), update: jest.fn(), findOne: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: NotificationService,
          useValue: {
            notifyApprovalRequired: jest.fn(),
            notifyRequestApproved: jest.fn(),
            notifyRequestRejected: jest.fn(),
            notifyRequestUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ApprovalService);
    approvalStepRepository = module.get(getRepositoryToken(ApprovalStep));
  });

  describe('findPendingForUser', () => {
    it('returns actionable pending steps for the approver', async () => {
      const level1Step = buildStep({ id: 'step-1', level: 1 });
      const level2Step = buildStep({
        id: 'step-2',
        level: 2,
        approver: { id: adminId } as Employee,
      });

      approvalStepRepository.find.mockImplementation(async (options) => {
        const approverId = (options as { where: { approver: { id: string } } })
          .where.approver.id;
        if (approverId === managerId) return [level1Step];
        if (approverId === adminId) return [level2Step];
        return [];
      });
      approvalStepRepository.findOne.mockResolvedValue({
        level: 1,
        status: ApprovalStepStatus.APPROVED,
      } as ApprovalStep);

      const forManager = await service.findPendingForUser(managerId);
      expect(forManager).toEqual([level1Step]);

      const forAdmin = await service.findPendingForUser(adminId);
      expect(forAdmin).toEqual([level2Step]);
    });

    it('excludes level 2 steps when level 1 is not yet approved', async () => {
      const level2Step = buildStep({
        id: 'step-2',
        level: 2,
        approver: { id: adminId } as Employee,
      });

      approvalStepRepository.find.mockResolvedValue([level2Step]);
      approvalStepRepository.findOne.mockResolvedValue({
        level: 1,
        status: ApprovalStepStatus.PENDING,
      } as ApprovalStep);

      const result = await service.findPendingForUser(adminId);

      expect(result).toEqual([]);
    });
  });

  describe('approve', () => {
    it('throws when user is not the designated approver', async () => {
      approvalStepRepository.findOne.mockResolvedValue(buildStep());

      await expect(service.approve(stepId, otherUser, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws when step not found', async () => {
      approvalStepRepository.findOne.mockResolvedValue(null);

      await expect(service.approve('missing', managerUser, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('finalizes request and assigns equipment when last level approved', async () => {
      const step = buildStep();
      step.request.approvalSteps = [step];
      approvalStepRepository.findOne.mockResolvedValue(step);

      const updatedStep = {
        ...step,
        status: ApprovalStepStatus.APPROVED,
      };

      const mockStepRepo = {
        findOneOrFail: jest
          .fn()
          .mockResolvedValueOnce(step)
          .mockResolvedValueOnce(updatedStep),
        save: jest.fn().mockResolvedValue(updatedStep),
        find: jest
          .fn()
          .mockResolvedValue([
            { ...step, status: ApprovalStepStatus.APPROVED },
          ]),
      };
      const mockRequestRepo = {
        save: jest.fn(),
        update: jest.fn(),
      };
      const mockEquipmentRepo = {
        findOne: jest.fn().mockResolvedValue({ ...equipment }),
        save: jest.fn().mockResolvedValue({
          ...equipment,
          status: EquipmentStatus.IN_USE,
        }),
      };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === ApprovalStep) return mockStepRepo;
              if (entity === EquipmentRequest) return mockRequestRepo;
              if (entity === Equipment) return mockEquipmentRepo;
              return {};
            },
          }),
      );

      const result = await service.approve(stepId, managerUser, {
        comment: 'Looks good',
      });

      expect(mockEquipmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EquipmentStatus.IN_USE,
          assignedEmployee: requester,
        }),
      );
      expect(result.status).toBe(ApprovalStepStatus.APPROVED);
    });
  });

  describe('reject', () => {
    it('throws when step already processed', async () => {
      approvalStepRepository.findOne.mockResolvedValue(
        buildStep({ status: ApprovalStepStatus.APPROVED }),
      );

      await expect(
        service.reject(stepId, managerUser, { comment: 'No budget' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects request and skips remaining pending steps', async () => {
      const level2Pending = {
        id: 'step-2',
        level: 2,
        status: ApprovalStepStatus.PENDING,
      } as ApprovalStep;
      const step = buildStep({
        request: {
          id: requestId,
          status: RequestStatus.PENDING,
          requester,
          equipment,
          approvalSteps: [buildStep(), level2Pending],
        } as EquipmentRequest,
      });
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
        find: jest.fn(),
      };
      const mockRequestRepo = {
        save: jest.fn(),
        update: jest.fn(),
      };

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

      await service.reject(stepId, managerUser, { comment: 'Denied' });

      expect(mockRequestRepo.update).toHaveBeenCalledWith(requestId, {
        status: RequestStatus.REJECTED,
      });
      expect(mockStepRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ApprovalStepStatus.SKIPPED }),
      );
    });
  });

  describe('approve multi-level', () => {
    it('sets partially approved when more levels remain', async () => {
      const level2Pending = {
        id: 'step-2',
        level: 2,
        status: ApprovalStepStatus.PENDING,
      } as ApprovalStep;
      const step = buildStep({
        request: {
          id: requestId,
          status: RequestStatus.PENDING,
          requester,
          equipment,
          approvalSteps: [buildStep(), level2Pending],
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
        find: jest
          .fn()
          .mockResolvedValue([
            { ...step, status: ApprovalStepStatus.APPROVED },
            level2Pending,
          ]),
      };
      const mockRequestRepo = {
        save: jest.fn(),
        update: jest.fn(),
      };

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

      await service.approve(stepId, managerUser, { comment: 'OK' });

      expect(mockRequestRepo.update).toHaveBeenCalledWith(requestId, {
        status: RequestStatus.PARTIALLY_APPROVED,
      });
    });
  });
});
