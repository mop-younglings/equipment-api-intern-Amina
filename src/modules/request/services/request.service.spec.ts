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
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { ApprovalRole } from '../../approval/enums/approval-role.enum';
import { ApprovalStepStatus } from '../../approval/enums/approval-step-status.enum';
import { Department } from '../../department/entities/department.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { AccountStatus } from '../../employee/enums/account-status.enum';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { CancelRequestDto } from '../dto/cancel-request.dto';
import { CreateRequestDto } from '../dto/create-request.dto';
import { EquipmentRequest } from '../entities/equipment-request.entity';
import { RequestStatus } from '../enums/request-status.enum';
import { RequestType } from '../enums/request-type.enum';
import { RequestService } from './request.service';

describe('RequestService', () => {
  let service: RequestService;
  let requestRepository: jest.Mocked<Repository<EquipmentRequest>>;
  let modelRepository: jest.Mocked<Repository<EquipmentModel>>;
  let categoryRepository: jest.Mocked<Repository<EquipmentCategory>>;
  let employeeRepository: jest.Mocked<Repository<Employee>>;
  let notificationService: jest.Mocked<NotificationService>;
  let accessControl: jest.Mocked<AccessControlService>;
  let dataSource: { transaction: jest.Mock };

  const userId = 'user-1';
  const managerId = 'manager-1';
  const modelId = 'model-1';
  const categoryId = 'category-1';

  const user: AuthenticatedUser = {
    id: userId,
    email: 'jane@example.com',
    role: EmployeeRole.EMPLOYEE,
  };

  const manager: Employee = {
    id: managerId,
    firstName: 'Bob',
    lastName: 'Manager',
    email: 'bob@example.com',
    password: 'hash',
    role: EmployeeRole.DIRECT_MANAGER,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const department: Department = {
    id: 'dept-1',
    name: 'Engineering',
    directManager: manager,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const requester: Employee = {
    id: userId,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hash',
    role: EmployeeRole.EMPLOYEE,
    accountStatus: AccountStatus.ACTIVE,
    department,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const equipmentModel: EquipmentModel = {
    id: modelId,
    name: 'MacBook Pro',
    category: { id: categoryId, name: 'Laptop' } as EquipmentCategory,
    lowStockThreshold: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const category: EquipmentCategory = {
    id: categoryId,
    name: 'Furniture',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
        {
          provide: getRepositoryToken(EquipmentRequest),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EquipmentModel),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentCategory),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: { findOne: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: NotificationService,
          useValue: {
            notifyApprovalRequired: jest.fn(),
            notifyRequestCancelled: jest.fn(),
          },
        },
        {
          provide: AccessControlService,
          useValue: {
            isAdmin: jest.fn().mockReturnValue(false),
            isProcurementManagerOrAbove: jest.fn().mockReturnValue(false),
            isDirectManagerOrAbove: jest.fn().mockReturnValue(false),
            isEmployeeInManagedDepartments: jest.fn(),
            getManagedDepartmentIds: jest.fn(),
            getDepartmentEmployeeIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RequestService);
    requestRepository = module.get(getRepositoryToken(EquipmentRequest));
    modelRepository = module.get(getRepositoryToken(EquipmentModel));
    categoryRepository = module.get(getRepositoryToken(EquipmentCategory));
    employeeRepository = module.get(getRepositoryToken(Employee));
    notificationService = module.get(NotificationService);
    accessControl = module.get(AccessControlService);
  });

  describe('findMyRequests', () => {
    it('returns requests for the authenticated user', async () => {
      const requests = [{ id: 'req-1' }] as EquipmentRequest[];
      requestRepository.find.mockResolvedValue(requests);

      const result = await service.findMyRequests(userId);

      expect(result).toEqual(requests);
      expect(requestRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { requester: { id: userId } },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns request for owner', async () => {
      const request = {
        id: 'req-1',
        requester: { id: userId },
      } as EquipmentRequest;

      requestRepository.findOne.mockResolvedValue(request);

      const result = await service.findOne('req-1', user);

      expect(result).toEqual(request);
    });

    it('throws ForbiddenException for unauthorized viewer', async () => {
      requestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        requester: { id: 'other-user' },
      } as EquipmentRequest);

      await expect(service.findOne('req-1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when request missing', async () => {
      requestRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows procurement manager to view any request', async () => {
      const request = {
        id: 'req-1',
        requester: { id: 'other-user' },
      } as EquipmentRequest;
      requestRepository.findOne.mockResolvedValue(request);
      accessControl.isProcurementManagerOrAbove.mockReturnValue(true);

      const result = await service.findOne('req-1', user);

      expect(result).toEqual(request);
    });
  });

  describe('create', () => {
    const loanDto: CreateRequestDto = {
      requestType: RequestType.LOAN,
      equipmentModelId: modelId,
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      purpose: 'Development work',
    };

    const procurementDto: CreateRequestDto = {
      requestType: RequestType.PROCUREMENT,
      requestedItemName: 'Standing desk',
      categoryId,
      quantity: 2,
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      purpose: 'Office setup',
    };

    it('throws when requester has no direct manager', async () => {
      employeeRepository.findOne.mockResolvedValue({
        ...requester,
        department: { ...department, directManager: undefined },
      });

      await expect(service.create(loanDto, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when loan request missing equipmentModelId', async () => {
      employeeRepository.findOne.mockResolvedValue(requester);

      await expect(
        service.create({ ...loanDto, equipmentModelId: undefined }, user),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when equipment model not found', async () => {
      employeeRepository.findOne.mockResolvedValue(requester);
      modelRepository.findOne.mockResolvedValue(null);

      await expect(service.create(loanDto, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates loan request with manager approval step', async () => {
      employeeRepository.findOne.mockResolvedValue(requester);
      modelRepository.findOne.mockResolvedValue(equipmentModel);

      const savedRequest = {
        id: 'req-1',
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
        approvalSteps: [{ level: 1, approver: manager }],
      } as EquipmentRequest;

      const mockRequestRepo = {
        create: jest.fn().mockReturnValue(savedRequest),
        save: jest.fn().mockResolvedValue(savedRequest),
        findOneOrFail: jest.fn().mockResolvedValue(savedRequest),
      };
      const mockStepRepo = {
        create: jest.fn((data) => data),
        save: jest.fn().mockResolvedValue({}),
      };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === EquipmentRequest) return mockRequestRepo;
              if (entity === ApprovalStep) return mockStepRepo;
              return {};
            },
          }),
      );

      const result = await service.create(loanDto, user);

      expect(mockStepRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 1,
          approver: manager,
          approverRole: ApprovalRole.DIRECT_MANAGER,
          status: ApprovalStepStatus.PENDING,
        }),
      );
      expect(notificationService.notifyApprovalRequired).toHaveBeenCalled();
      expect(result.status).toBe(RequestStatus.PENDING_MANAGER_APPROVAL);
    });

    it('creates procurement request with category', async () => {
      employeeRepository.findOne.mockResolvedValue(requester);
      categoryRepository.findOne.mockResolvedValue(category);

      const savedRequest = {
        id: 'req-2',
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
        approvalSteps: [{ level: 1, approver: manager }],
      } as EquipmentRequest;

      const mockRequestRepo = {
        create: jest.fn().mockReturnValue(savedRequest),
        save: jest.fn().mockResolvedValue(savedRequest),
        findOneOrFail: jest.fn().mockResolvedValue(savedRequest),
      };
      const mockStepRepo = {
        create: jest.fn((data) => data),
        save: jest.fn().mockResolvedValue({}),
      };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === EquipmentRequest) return mockRequestRepo;
              if (entity === ApprovalStep) return mockStepRepo;
              return {};
            },
          }),
      );

      const result = await service.create(procurementDto, user);

      expect(mockRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestType: RequestType.PROCUREMENT,
          requestedItemName: 'Standing desk',
          category,
        }),
      );
      expect(result.id).toBe('req-2');
    });
  });

  describe('cancel', () => {
    const cancelDto: CancelRequestDto = { reason: 'No longer needed' };

    it('throws when user is not the requester', async () => {
      requestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        requester: { id: 'other-user' },
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
      } as EquipmentRequest);

      await expect(service.cancel('req-1', user, cancelDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws when request is not cancellable', async () => {
      requestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        requester: { id: userId },
        status: RequestStatus.FULFILLED,
      } as EquipmentRequest);

      await expect(service.cancel('req-1', user, cancelDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancels pending request and notifies requester', async () => {
      const request = {
        id: 'req-1',
        requester: { id: userId },
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
      } as EquipmentRequest;
      requestRepository.findOne.mockResolvedValue(request);
      requestRepository.save.mockResolvedValue({
        ...request,
        status: RequestStatus.CANCELLED,
        cancellationReason: cancelDto.reason,
      });

      const result = await service.cancel('req-1', user, cancelDto);

      expect(result.status).toBe(RequestStatus.CANCELLED);
      expect(notificationService.notifyRequestCancelled).toHaveBeenCalled();
    });
  });

  describe('manager and procurement queries', () => {
    it('returns empty list when manager has no departments', async () => {
      accessControl.getManagedDepartmentIds.mockResolvedValue([]);
      await expect(service.findManagerPending(user)).resolves.toEqual([]);
    });

    it('returns manager team requests', async () => {
      accessControl.getManagedDepartmentIds.mockResolvedValue(['dept-1']);
      accessControl.getDepartmentEmployeeIds.mockResolvedValue(['emp-1']);
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'req-1' }]),
      };
      requestRepository.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.findManagerRequests(user);
      expect(result).toHaveLength(1);
    });

    it('returns procurement pending requests', async () => {
      requestRepository.find.mockResolvedValue([{ id: 'req-1' }]);
      const result = await service.findProcurementPending();
      expect(result).toHaveLength(1);
    });

    it('builds request timeline', async () => {
      const request = {
        id: 'req-1',
        requester: { id: userId },
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
        approvalSteps: [
          {
            id: 's1',
            level: 1,
            approverRole: ApprovalRole.DIRECT_MANAGER,
            approver: { firstName: 'Bob', lastName: 'Manager' },
            status: ApprovalStepStatus.PENDING,
          },
        ],
        assignments: [],
      } as EquipmentRequest;
      requestRepository.findOne.mockResolvedValue(request);

      const timeline = await service.getTimeline('req-1', user);
      expect(timeline.steps).toHaveLength(1);
    });
  });
});
