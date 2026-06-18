import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RETIRE_GRACE_PERIOD_DAYS } from '../../../common/constants/workflow.constants';
import { AccessControlService } from '../../../common/services/access-control.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Employee } from '../../employee/entities/employee.entity';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentAsset } from '../entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../enums/equipment-asset-status.enum';
import { EquipmentAssetService } from './equipment-asset.service';

describe('EquipmentAssetService', () => {
  let service: EquipmentAssetService;
  let assetRepository: jest.Mocked<Repository<EquipmentAsset>>;
  let assignmentRepository: jest.Mocked<Repository<EquipmentAssignment>>;

  const assetId = 'asset-1';
  const modelId = 'model-1';

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'proc@example.com',
    role: EmployeeRole.PROCUREMENT_MANAGER,
  };

  const model: EquipmentModel = {
    id: modelId,
    name: 'MacBook Pro',
    category: { id: 'category-1', name: 'Laptop' } as EquipmentCategory,
    defaultValue: 0,
    lowStockThreshold: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const buildAvailableAsset = (): EquipmentAsset => ({
    id: assetId,
    equipmentModel: model,
    assetTag: 'MBP-001',
    status: EquipmentAssetStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentAssetService,
        {
          provide: getRepositoryToken(EquipmentAsset),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EquipmentModel),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentAssignment),
          useValue: { count: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentRequest),
          useValue: { findOne: jest.fn(), update: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { notifyEquipmentAssigned: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: AccessControlService,
          useValue: {
            isProcurementManagerOrAbove: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get(EquipmentAssetService);
    assetRepository = module.get(getRepositoryToken(EquipmentAsset));
    assignmentRepository = module.get(getRepositoryToken(EquipmentAssignment));
  });

  describe('findOne', () => {
    it('throws NotFoundException when asset missing', async () => {
      assetRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(assetId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes available asset without history', async () => {
      assetRepository.findOne.mockResolvedValue(buildAvailableAsset());
      assignmentRepository.count.mockResolvedValue(0);

      await service.remove(assetId);

      expect(assetRepository.remove).toHaveBeenCalled();
    });

    it('throws when asset has assignment history', async () => {
      assetRepository.findOne.mockResolvedValue(buildAvailableAsset());
      assignmentRepository.count.mockResolvedValue(1);

      await expect(service.remove(assetId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when retired asset is within grace period', async () => {
      const retiredAsset = {
        ...buildAvailableAsset(),
        status: EquipmentAssetStatus.RETIRED,
        retiredAt: new Date(),
      };
      assetRepository.findOne.mockResolvedValue(retiredAsset);

      await expect(service.remove(assetId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove(assetId)).rejects.toThrow(
        String(RETIRE_GRACE_PERIOD_DAYS),
      );
    });
  });

  describe('retire', () => {
    it('marks asset as retired', async () => {
      assetRepository.findOne.mockResolvedValue(buildAvailableAsset());
      assetRepository.save.mockImplementation(async (asset) => asset);

      const result = await service.retire(assetId, user);

      expect(result.status).toBe(EquipmentAssetStatus.RETIRED);
      expect(result.retiredAt).toBeDefined();
      expect(assetRepository.save).toHaveBeenCalled();
    });

    it('returns already retired asset unchanged', async () => {
      const retiredAsset = {
        ...buildAvailableAsset(),
        status: EquipmentAssetStatus.RETIRED,
        retiredAt: new Date('2020-01-01'),
      };
      assetRepository.findOne.mockResolvedValue(retiredAsset);

      const result = await service.retire(assetId, user);

      expect(result.status).toBe(EquipmentAssetStatus.RETIRED);
      expect(assetRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('create and assign', () => {
    it('creates asset for model', async () => {
      const modelRepo = service['modelRepository'] as jest.Mocked<
        Repository<EquipmentModel>
      >;
      modelRepo.findOne.mockResolvedValue(model);
      assetRepository.findOne.mockResolvedValue(null);
      assetRepository.create.mockReturnValue(buildAvailableAsset());
      assetRepository.save.mockResolvedValue(buildAvailableAsset());

      const result = await service.create({
        equipmentModelId: modelId,
        assetTag: 'MBP-001',
      });

      expect(assetRepository.findOne).toHaveBeenCalledWith({
        where: { assetTag: 'MBP-001' },
      });
      expect(result.assetTag).toBe('MBP-001');
    });

    it('throws ConflictException when asset tag already exists', async () => {
      const modelRepo = service['modelRepository'] as jest.Mocked<
        Repository<EquipmentModel>
      >;
      modelRepo.findOne.mockResolvedValue(model);
      assetRepository.findOne.mockResolvedValue(buildAvailableAsset());

      await expect(
        service.create({
          equipmentModelId: modelId,
          assetTag: 'MBP-001',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.create({
          equipmentModelId: modelId,
          assetTag: 'MBP-001',
        }),
      ).rejects.toThrow('Asset tag already exists');

      expect(assetRepository.create).not.toHaveBeenCalled();
      expect(assetRepository.save).not.toHaveBeenCalled();
    });

    it('assigns available asset to employee', async () => {
      const employeeRepo = service['employeeRepository'] as jest.Mocked<
        Repository<Employee>
      >;
      assetRepository.findOne.mockResolvedValue(buildAvailableAsset());
      employeeRepo.findOne.mockResolvedValue({ id: 'emp-1' } as Employee);
      assetRepository.save.mockResolvedValue(buildAvailableAsset());
      assignmentRepository.create.mockReturnValue({
        id: 'asg-1',
      } as EquipmentAssignment);
      assignmentRepository.save.mockResolvedValue({
        id: 'asg-1',
      } as EquipmentAssignment);

      const result = await service.assign(
        assetId,
        { employeeId: 'emp-1' },
        user,
      );
      expect(result.id).toBe('asg-1');
    });
  });

  describe('getInventoryStats', () => {
    it('returns stats and low stock models', async () => {
      assetRepository.find.mockResolvedValue([
        { ...buildAvailableAsset(), equipmentModel: model },
      ]);
      const modelRepo = service['modelRepository'] as jest.Mocked<
        Repository<EquipmentModel>
      >;
      modelRepo.find.mockResolvedValue([model]);

      const stats = await service.getInventoryStats();
      expect(stats.totalAssets).toBe(1);
      expect(stats.lowStockModels).toHaveLength(1);
    });
  });

  describe('update helpers', () => {
    it('updates asset fields', async () => {
      const asset = buildAvailableAsset();
      assetRepository.findOne.mockResolvedValue(asset);
      assetRepository.save.mockImplementation(async (a) => a);
      const result = await service.update(assetId, { notes: 'Updated' });
      expect(result.notes).toBe('Updated');
    });

    it('updates asset status', async () => {
      const asset = buildAvailableAsset();
      assetRepository.findOne.mockResolvedValue(asset);
      assetRepository.save.mockImplementation(async (a) => a);
      const result = await service.updateStatus(assetId, {
        status: EquipmentAssetStatus.MAINTENANCE,
      });
      expect(result.status).toBe(EquipmentAssetStatus.MAINTENANCE);
    });
  });
});
