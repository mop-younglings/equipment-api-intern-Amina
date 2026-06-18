import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EquipmentCategory } from '../entities/equipment-category.entity';
import { EquipmentCategoryService } from './equipment-category.service';

describe('EquipmentCategoryService', () => {
  let service: EquipmentCategoryService;
  const repo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentCategoryService,
        { provide: getRepositoryToken(EquipmentCategory), useValue: repo },
      ],
    }).compile();
    service = module.get(EquipmentCategoryService);
    jest.clearAllMocks();
  });

  it('lists categories', async () => {
    repo.find.mockResolvedValue([{ id: 'c1', name: 'Laptop' }]);
    await expect(service.findAll()).resolves.toHaveLength(1);
  });

  it('creates category', async () => {
    repo.create.mockReturnValue({ name: 'Phone' });
    repo.save.mockResolvedValue({ id: 'c2', name: 'Phone' });
    const result = await service.create({ name: 'Phone' });
    expect(result.name).toBe('Phone');
  });
});
