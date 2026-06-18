import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestAlternative } from '../../request/entities/request-alternative.entity';
import { RequestAlternativeStatus } from '../../request/enums/request-alternative-status.enum';
import { SuggestAlternativeDto } from '../dto/procurement.dto';
import { ProcurementService } from './procurement.service';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let requestRepository: jest.Mocked<Repository<EquipmentRequest>>;
  let alternativeRepository: jest.Mocked<Repository<RequestAlternative>>;
  let modelRepository: jest.Mocked<Repository<EquipmentModel>>;
  let assetRepository: jest.Mocked<Repository<EquipmentAsset>>;
  let notificationService: jest.Mocked<NotificationService>;

  const requestId = 'request-1';
  const modelId = 'model-1';
  const userId = 'proc-1';

  const user: AuthenticatedUser = {
    id: userId,
    email: 'pat@example.com',
    role: 'procurement_manager' as AuthenticatedUser['role'],
  };

  const requester = {
    id: 'employee-1',
    firstName: 'Jane',
    lastName: 'Doe',
  } as Employee;

  const equipmentModel = {
    id: modelId,
    name: 'Dell Monitor',
  } as EquipmentModel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        {
          provide: getRepositoryToken(EquipmentRequest),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(RequestAlternative),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentModel),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(EquipmentAsset),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { notifyAlternativeSuggested: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ProcurementService);
    requestRepository = module.get(getRepositoryToken(EquipmentRequest));
    alternativeRepository = module.get(getRepositoryToken(RequestAlternative));
    modelRepository = module.get(getRepositoryToken(EquipmentModel));
    assetRepository = module.get(getRepositoryToken(EquipmentAsset));
    notificationService = module.get(NotificationService);
  });

  describe('checkAvailability', () => {
    it('throws when request not found', async () => {
      requestRepository.findOne.mockResolvedValue(null);

      await expect(service.checkAvailability(requestId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns available assets for loan request', async () => {
      requestRepository.findOne.mockResolvedValue({
        id: requestId,
        equipmentModel,
      } as EquipmentRequest);
      const assets = [
        { id: 'asset-1', status: EquipmentAssetStatus.AVAILABLE },
      ] as EquipmentAsset[];
      assetRepository.find.mockResolvedValue(assets);

      const result = await service.checkAvailability(requestId);

      expect(result).toEqual({
        requestId,
        equipmentModelId: modelId,
        availableCount: 1,
        assets,
      });
    });

    it('returns zero availability for procurement request', async () => {
      requestRepository.findOne.mockResolvedValue({
        id: requestId,
      } as EquipmentRequest);
      const result = await service.checkAvailability(requestId);
      expect(result.availableCount).toBe(0);
    });
  });

  describe('suggestAlternative', () => {
    it('creates alternative and notifies requester', async () => {
      const dto: SuggestAlternativeDto = {
        equipmentModelId: modelId,
        message: 'Try this model instead',
      };
      requestRepository.findOne.mockResolvedValue({
        id: requestId,
        requester,
      } as EquipmentRequest);
      modelRepository.findOne.mockResolvedValue(equipmentModel);

      const savedAlternative = {
        id: 'alt-1',
        status: RequestAlternativeStatus.SUGGESTED,
      } as RequestAlternative;
      alternativeRepository.create.mockReturnValue(savedAlternative);
      alternativeRepository.save.mockResolvedValue(savedAlternative);

      const result = await service.suggestAlternative(requestId, user, dto);

      expect(result).toEqual(savedAlternative);
      expect(
        notificationService.notifyAlternativeSuggested,
      ).toHaveBeenCalledWith(
        requester,
        expect.objectContaining({ id: requestId }),
        equipmentModel.name,
        dto.message,
      );
    });
  });
});
