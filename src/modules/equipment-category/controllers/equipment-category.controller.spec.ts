import { Test } from '@nestjs/testing';
import { EquipmentCategoryController } from './equipment-category.controller';
import { EquipmentCategoryService } from '../services/equipment-category.service';

describe('EquipmentCategoryController', () => {
  const categoryService = { findAll: jest.fn(), create: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('lists and creates categories', async () => {
    const module = await Test.createTestingModule({
      controllers: [EquipmentCategoryController],
      providers: [
        { provide: EquipmentCategoryService, useValue: categoryService },
      ],
    }).compile();
    const controller = module.get(EquipmentCategoryController);
    categoryService.findAll.mockResolvedValue([]);
    await controller.findAll();
    categoryService.create.mockResolvedValue({ id: 'c1' });
    await controller.create({ name: 'Laptop' });
    expect(categoryService.create).toHaveBeenCalled();
  });
});
