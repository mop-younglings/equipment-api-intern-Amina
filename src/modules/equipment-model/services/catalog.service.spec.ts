import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../entities/equipment-model.entity';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;
  const modelRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const assetRepo = { find: jest.fn() };
  const categoryRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: getRepositoryToken(EquipmentModel), useValue: modelRepo },
        { provide: getRepositoryToken(EquipmentAsset), useValue: assetRepo },
        {
          provide: getRepositoryToken(EquipmentCategory),
          useValue: categoryRepo,
        },
      ],
    }).compile();

    service = module.get(CatalogService);
    jest.clearAllMocks();
  });

  it('returns catalog with availability counts', async () => {
    const model = { id: 'm1', name: 'Laptop', category: { id: 'c1' } };
    modelRepo.find.mockResolvedValue([model]);
    assetRepo.find.mockResolvedValue([
      { equipmentModel: { id: 'm1' }, status: EquipmentAssetStatus.AVAILABLE },
    ]);

    const result = await service.getCatalog();
    expect(result[0].availableCount).toBe(1);
    expect(result[0].isAvailable).toBe(true);
  });

  it('finds similar models', async () => {
    modelRepo.find.mockResolvedValue([{ id: 'm1', name: 'Dell' }]);
    assetRepo.find.mockResolvedValue([]);
    const result = await service.findSimilar('Dell');
    expect(result).toHaveLength(1);
  });

  it('throws when model not found', async () => {
    modelRepo.findOne.mockResolvedValue(null);
    await expect(service.findModelById('missing')).rejects.toThrow();
  });

  it('finds similar models by id', async () => {
    modelRepo.findOne.mockResolvedValue({
      id: 'm1',
      name: 'Dell',
      category: { id: 'c1' },
    });
    modelRepo.find.mockResolvedValue([]);
    assetRepo.find.mockResolvedValue([]);
    const result = await service.findSimilarModels('m1');
    expect(result).toEqual([]);
  });
});
