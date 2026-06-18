import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessControlService } from '../../../common/services/access-control.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Employee } from '../../employee/entities/employee.entity';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentAssignment } from '../entities/equipment-assignment.entity';
import { EquipmentAssignmentStatus } from '../enums/equipment-assignment-status.enum';
import { EquipmentAssignmentService } from './equipment-assignment.service';

describe('EquipmentAssignmentService', () => {
  let service: EquipmentAssignmentService;
  let assignmentRepository: jest.Mocked<Repository<EquipmentAssignment>>;
  let assetRepository: jest.Mocked<Repository<EquipmentAsset>>;
  let accessControl: jest.Mocked<AccessControlService>;
  let notificationService: jest.Mocked<NotificationService>;

  const assignmentId = 'assignment-1';
  const employeeId = 'employee-1';
  const managerId = 'manager-1';

  const employeeUser: AuthenticatedUser = {
    id: employeeId,
    email: 'jane@example.com',
    role: EmployeeRole.EMPLOYEE,
  };

  const managerUser: AuthenticatedUser = {
    id: managerId,
    email: 'bob@example.com',
    role: EmployeeRole.DIRECT_MANAGER,
  };

  const equipmentAsset: EquipmentAsset = {
    id: 'asset-1',
    status: EquipmentAssetStatus.IN_USE,
    equipmentModel: { id: 'model-1', name: 'MacBook Pro' } as EquipmentModel,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeAssignment: EquipmentAssignment = {
    id: assignmentId,
    status: EquipmentAssignmentStatus.ACTIVE,
    employee: { id: employeeId } as Employee,
    equipmentAsset,
    assignedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentAssignmentService,
        {
          provide: getRepositoryToken(EquipmentAssignment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EquipmentAsset),
          useValue: { save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: {
            notifyEquipmentReturnRequested: jest.fn(),
            notifyEquipmentReturned: jest.fn(),
          },
        },
        {
          provide: AccessControlService,
          useValue: {
            isDirectManagerOrAbove: jest.fn(),
            isProcurementManagerOrAbove: jest.fn().mockReturnValue(false),
            isEmployeeInManagedDepartments: jest.fn(),
            getManagedDepartmentIds: jest.fn(),
            getDepartmentEmployeeIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EquipmentAssignmentService);
    assignmentRepository = module.get(getRepositoryToken(EquipmentAssignment));
    assetRepository = module.get(getRepositoryToken(EquipmentAsset));
    accessControl = module.get(AccessControlService);
    notificationService = module.get(NotificationService);
  });

  describe('findOne', () => {
    it('throws NotFoundException when assignment missing', async () => {
      assignmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(assignmentId, employeeUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows employee to view own assignment', async () => {
      assignmentRepository.findOne.mockResolvedValue(activeAssignment);

      const result = await service.findOne(assignmentId, employeeUser);

      expect(result).toEqual(activeAssignment);
    });
  });

  describe('requestReturn', () => {
    it('throws when user is not a manager', async () => {
      assignmentRepository.findOne.mockResolvedValue(activeAssignment);
      accessControl.isDirectManagerOrAbove.mockReturnValue(false);

      await expect(
        service.requestReturn(assignmentId, employeeUser, {
          returnByDate: '2026-08-01',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when assignment is not active', async () => {
      assignmentRepository.findOne.mockResolvedValue({
        ...activeAssignment,
        status: EquipmentAssignmentStatus.RETURNED,
      });
      accessControl.isDirectManagerOrAbove.mockReturnValue(true);
      accessControl.isEmployeeInManagedDepartments.mockResolvedValue(true);

      await expect(
        service.requestReturn(assignmentId, managerUser, {
          returnByDate: '2026-08-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requests return and notifies employee', async () => {
      assignmentRepository.findOne.mockResolvedValue(activeAssignment);
      accessControl.isDirectManagerOrAbove.mockReturnValue(true);
      accessControl.isEmployeeInManagedDepartments.mockResolvedValue(true);
      assignmentRepository.save.mockImplementation(async (a) => a);
      assetRepository.save.mockImplementation(async (a) => a);

      const result = await service.requestReturn(assignmentId, managerUser, {
        returnByDate: '2026-08-01',
        message: 'Please return',
      });

      expect(result.status).toBe(EquipmentAssignmentStatus.RETURN_REQUESTED);
      expect(assetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EquipmentAssetStatus.RETURN_REQUESTED,
        }),
      );
      expect(
        notificationService.notifyEquipmentReturnRequested,
      ).toHaveBeenCalled();
    });
  });

  describe('completeReturn', () => {
    it('completes return for employee', async () => {
      const returnRequested = {
        ...activeAssignment,
        status: EquipmentAssignmentStatus.RETURN_REQUESTED,
      };
      assignmentRepository.findOne.mockResolvedValue(returnRequested);
      assignmentRepository.save.mockImplementation(async (a) => a);
      assetRepository.save.mockImplementation(async (a) => a);

      const result = await service.completeReturn(assignmentId, employeeUser);

      expect(result.status).toBe(EquipmentAssignmentStatus.RETURNED);
      expect(assetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: EquipmentAssetStatus.AVAILABLE }),
      );
      expect(notificationService.notifyEquipmentReturned).toHaveBeenCalled();
    });
  });

  describe('team equipment and access', () => {
    it('returns team equipment for managed departments', async () => {
      accessControl.getManagedDepartmentIds.mockResolvedValue(['dept-1']);
      accessControl.getDepartmentEmployeeIds.mockResolvedValue(['emp-1']);
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([activeAssignment]),
      };
      assignmentRepository.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.findTeamEquipment(managerUser);
      expect(result).toHaveLength(1);
    });

    it('forbids viewing another employee assignment', async () => {
      assignmentRepository.findOne.mockResolvedValue(activeAssignment);
      accessControl.isProcurementManagerOrAbove.mockReturnValue(false);
      accessControl.isDirectManagerOrAbove.mockReturnValue(false);

      await expect(
        service.findOne(assignmentId, {
          id: 'other',
          email: 'x',
          role: EmployeeRole.EMPLOYEE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
