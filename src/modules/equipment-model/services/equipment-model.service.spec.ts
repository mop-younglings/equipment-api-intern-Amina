import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../entities/equipment-model.entity';
import { EquipmentModelService } from './equipment-model.service';

describe('EquipmentModelService', () => {
  let service: EquipmentModelService;
  const modelRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const categoryRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentModelService,
        { provide: getRepositoryToken(EquipmentModel), useValue: modelRepo },
        {
          provide: getRepositoryToken(EquipmentCategory),
          useValue: categoryRepo,
        },
      ],
    }).compile();
    service = module.get(EquipmentModelService);
    jest.clearAllMocks();
  });

  it('creates a model', async () => {
    categoryRepo.findOne.mockResolvedValue({ id: 'c1' });
    modelRepo.create.mockReturnValue({ name: 'X' });
    modelRepo.save.mockResolvedValue({ id: 'm1', name: 'X' });
    const result = await service.create({ name: 'X', categoryId: 'c1' });
    expect(result.id).toBe('m1');
  });

  it('throws when model missing', async () => {
    modelRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
