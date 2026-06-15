import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { Employee } from '../../employee/entities/employee.entity';
import { Equipment } from '../../equipment/entities/equipment.entity';
import { EquipmentStatus } from '../../equipment/enums/equipment-status.enum';
import { NotificationService } from '../../notification/services/notification.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import { EquipmentRequest } from '../entities/equipment-request.entity';
import { RequestStatus } from '../enums/request-status.enum';
import { RequestService } from './request.service';

describe('RequestService', () => {
  let service: RequestService;
  let requestRepository: jest.Mocked<Repository<EquipmentRequest>>;
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;
  let employeeRepository: jest.Mocked<Repository<Employee>>;
  let dataSource: { transaction: jest.Mock };

  const userId = 'user-1';
  const managerId = 'manager-1';
  const equipmentId = 'equipment-1';
  const adminId = 'admin-1';

  const user: AuthenticatedUser = {
    id: userId,
    email: 'jane@example.com',
    role: EmployeeRole.USER,
  };

  const adminUser: AuthenticatedUser = {
    id: adminId,
    email: 'admin@example.com',
    role: EmployeeRole.ADMIN,
  };

  const manager: Employee = {
    id: managerId,
    firstName: 'Bob',
    lastName: 'Manager',
    email: 'bob@example.com',
    department: 'Engineering',
    password: 'hash',
    role: EmployeeRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const requester: Employee = {
    id: userId,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    department: 'Engineering',
    password: 'hash',
    role: EmployeeRole.USER,
    manager,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const availableEquipment: Equipment = {
    id: equipmentId,
    name: 'iPhone 15',
    category: 'Phone',
    status: EquipmentStatus.AVAILABLE,
    value: 800,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const highValueEquipment: Equipment = {
    ...availableEquipment,
    id: 'equipment-2',
    name: 'MacBook Pro',
    value: 2500,
  };

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
        {
          provide: getRepositoryToken(EquipmentRequest),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ApprovalStep),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: NotificationService,
          useValue: { notifyApprovalRequired: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(RequestService);
    requestRepository = module.get(getRepositoryToken(EquipmentRequest));
    equipmentRepository = module.get(getRepositoryToken(Equipment));
    employeeRepository = module.get(getRepositoryToken(Employee));
  });

  describe('findAll', () => {
    it('scopes to requester for regular users', async () => {
      const getMany = jest.fn().mockResolvedValue([]);
      const andWhere = jest.fn().mockReturnThis();
      const addOrderBy = jest.fn().mockReturnThis();
      const orderBy = jest.fn().mockReturnThis();
      const leftJoinAndSelect = jest.fn().mockReturnThis();

      requestRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect,
        orderBy,
        addOrderBy,
        andWhere,
        getMany,
      } as never);

      await service.findAll(user);

      expect(andWhere).toHaveBeenCalledWith('requester.id = :userId', {
        userId: user.id,
      });
    });

    it('returns all requests for admins', async () => {
      const getMany = jest.fn().mockResolvedValue([]);
      const andWhere = jest.fn().mockReturnThis();

      requestRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere,
        getMany,
      } as never);

      await service.findAll(adminUser);

      expect(andWhere).not.toHaveBeenCalled();
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

    it('throws ForbiddenException for non-owner non-admin', async () => {
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
  });

  describe('create', () => {
    const dto: CreateRequestDto = {
      equipmentId,
      reason: 'Need phone for client calls',
    };

    it('throws when equipment is not available', async () => {
      equipmentRepository.findOne.mockResolvedValue({
        ...availableEquipment,
        status: EquipmentStatus.IN_USE,
      });

      await expect(service.create(dto, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when requester has no manager', async () => {
      equipmentRepository.findOne.mockResolvedValue(availableEquipment);
      employeeRepository.findOne.mockResolvedValue({
        ...requester,
        manager: undefined,
      });

      await expect(service.create(dto, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates single-level approval for standard-value equipment', async () => {
      equipmentRepository.findOne.mockResolvedValue(availableEquipment);
      employeeRepository.findOne.mockResolvedValue(requester);

      const savedRequest = {
        id: 'req-1',
        status: RequestStatus.PENDING,
        requiredApprovalLevels: 1,
      } as EquipmentRequest;

      const mockRequestRepo = {
        create: jest.fn().mockReturnValue(savedRequest),
        save: jest.fn().mockResolvedValue(savedRequest),
        findOneOrFail: jest.fn().mockResolvedValue({
          ...savedRequest,
          requester,
          equipment: availableEquipment,
          approvalSteps: [{ level: 1, approver: manager }],
        }),
      };
      const mockStepRepo = {
        create: jest.fn((data) => data),
        save: jest.fn().mockResolvedValue([]),
      };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === EquipmentRequest) return mockRequestRepo;
              if (entity === ApprovalStep) return mockStepRepo;
              return { findOne: jest.fn() };
            },
          }),
      );

      const result = await service.create(dto, user);

      expect(mockStepRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ level: 1, approver: manager }),
        ]),
      );
      expect(result.requiredApprovalLevels).toBe(1);
      expect(result.approvalSteps).toBeDefined();
    });

    it('throws when equipment not found', async () => {
      equipmentRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates two-level approval for high-value equipment', async () => {
      equipmentRepository.findOne.mockResolvedValue(highValueEquipment);
      employeeRepository.findOne.mockResolvedValue(requester);

      const admin = { id: adminId, role: EmployeeRole.ADMIN } as Employee;
      const savedRequest = {
        id: 'req-2',
        requiredApprovalLevels: 2,
      } as EquipmentRequest;

      const mockRequestRepo = {
        create: jest.fn().mockReturnValue(savedRequest),
        save: jest.fn().mockResolvedValue(savedRequest),
        findOneOrFail: jest.fn().mockResolvedValue({
          ...savedRequest,
          approvalSteps: [
            { level: 1, approver: manager },
            { level: 2, approver: admin },
          ],
        }),
      };
      const mockStepRepo = {
        create: jest.fn((data) => data),
        save: jest.fn(),
      };
      const mockEmployeeRepo = {
        findOne: jest.fn().mockResolvedValue(admin),
      };

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === EquipmentRequest) return mockRequestRepo;
              if (entity === ApprovalStep) return mockStepRepo;
              if (entity === Employee) return mockEmployeeRepo;
              return { findOne: jest.fn() };
            },
          }),
      );

      await service.create(
        { ...dto, equipmentId: highValueEquipment.id },
        user,
      );

      expect(mockStepRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ level: 1 }),
          expect.objectContaining({ level: 2, approver: admin }),
        ]),
      );
    });
  });
});
