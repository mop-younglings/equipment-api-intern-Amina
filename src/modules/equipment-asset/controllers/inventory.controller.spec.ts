import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { CatalogController, InventoryController } from './inventory.controller';
import { CatalogService } from '../../equipment-model/services/catalog.service';
import { EquipmentModelService } from '../../equipment-model/services/equipment-model.service';
import { EquipmentAssetService } from '../services/equipment-asset.service';

describe('Inventory controllers', () => {
  const catalogService = {
    getCatalog: jest.fn(),
    findSimilar: jest.fn(),
    findModelById: jest.fn(),
    findSimilarModels: jest.fn(),
  };
  const modelService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const assetService = {
    findAll: jest.fn(),
    getInventoryStats: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    assign: jest.fn(),
    remove: jest.fn(),
    retire: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('catalog controller delegates', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: CatalogService, useValue: catalogService },
        { provide: EquipmentModelService, useValue: modelService },
      ],
    }).compile();
    const controller = module.get(CatalogController);
    catalogService.getCatalog.mockResolvedValue([]);
    await controller.getCatalog();
    expect(catalogService.getCatalog).toHaveBeenCalled();
  });

  it('inventory controller delegates', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: EquipmentAssetService, useValue: assetService },
        { provide: EquipmentModelService, useValue: modelService },
      ],
    }).compile();
    const controller = module.get(InventoryController);
    assetService.getInventoryStats.mockResolvedValue({ totalAssets: 1 });
    await controller.getStats();
    expect(assetService.getInventoryStats).toHaveBeenCalled();
    await controller.assignAsset(
      'a1',
      { employeeId: 'e1' },
      {
        id: 'e1',
        email: 'x',
        role: EmployeeRole.ADMIN,
      },
    );
    expect(assetService.assign).toHaveBeenCalled();
  });
});
