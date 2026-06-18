import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { ProcurementService } from './procurement.service';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let requestRepository: jest.Mocked<Repository<EquipmentRequest>>;
  let assetRepository: jest.Mocked<Repository<EquipmentAsset>>;

  const requestId = 'request-1';
  const modelId = 'model-1';

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
          provide: getRepositoryToken(EquipmentAsset),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ProcurementService);
    requestRepository = module.get(getRepositoryToken(EquipmentRequest));
    assetRepository = module.get(getRepositoryToken(EquipmentAsset));
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
});
