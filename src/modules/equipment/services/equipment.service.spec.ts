import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { Equipment } from '../entities/equipment.entity';
import { EquipmentStatus } from '../enums/equipment-status.enum';
import { EquipmentService } from './equipment.service';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let repository: jest.Mocked<Repository<Equipment>>;

  const equipmentId = '550e8400-e29b-41d4-a716-446655440000';

  const mockEquipment: Equipment = {
    id: equipmentId,
    name: 'MacBook Pro 14"',
    category: 'Computer',
    description: 'M3, 16GB RAM',
    status: EquipmentStatus.AVAILABLE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EquipmentService);
    repository = module.get(getRepositoryToken(Equipment));
  });

  describe('findAll', () => {
    it('returns all equipment ordered by name', async () => {
      repository.find.mockResolvedValue([mockEquipment]);

      const result = await service.findAll();

      expect(result).toEqual([mockEquipment]);
      expect(repository.find).toHaveBeenCalledWith({
        relations: { assignedEmployee: true },
        order: { name: 'ASC' },
      });
    });

    it('returns an empty array when no equipment exists', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns equipment when found', async () => {
      repository.findOne.mockResolvedValue(mockEquipment);

      const result = await service.findOne(equipmentId);

      expect(result).toEqual(mockEquipment);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: equipmentId },
        relations: { assignedEmployee: true },
      });
    });

    it('throws NotFoundException when equipment does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(equipmentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(equipmentId)).rejects.toThrow(
        `Equipment with id "${equipmentId}" not found`,
      );
    });
  });

  describe('create', () => {
    it('creates equipment with default status when status is omitted', async () => {
      const dto: CreateEquipmentDto = {
        name: 'Dell Monitor',
        category: 'Display',
      };

      repository.create.mockReturnValue(mockEquipment);
      repository.save.mockResolvedValue(mockEquipment);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith({
        name: dto.name,
        category: dto.category,
        description: undefined,
        status: EquipmentStatus.AVAILABLE,
      });
      expect(repository.save).toHaveBeenCalledWith(mockEquipment);
      expect(result).toEqual(mockEquipment);
    });

    it('creates equipment with explicit status', async () => {
      const dto: CreateEquipmentDto = {
        name: 'iPhone 15',
        category: 'Phone',
        description: 'Company phone',
        status: EquipmentStatus.IN_USE,
      };

      const createdEquipment = {
        ...mockEquipment,
        ...dto,
      };

      repository.create.mockReturnValue(createdEquipment);
      repository.save.mockResolvedValue(createdEquipment);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith({
        name: dto.name,
        category: dto.category,
        description: dto.description,
        status: EquipmentStatus.IN_USE,
      });
      expect(result.status).toBe(EquipmentStatus.IN_USE);
    });
  });

  describe('update', () => {
    it('updates and returns equipment when found', async () => {
      const updateDto: UpdateEquipmentDto = {
        status: EquipmentStatus.MAINTENANCE,
      };
      const updatedEquipment = {
        ...mockEquipment,
        status: EquipmentStatus.MAINTENANCE,
      };

      repository.findOne.mockResolvedValue({ ...mockEquipment });
      repository.save.mockResolvedValue(updatedEquipment);

      const result = await service.update(equipmentId, updateDto);

      expect(result).toEqual(updatedEquipment);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: EquipmentStatus.MAINTENANCE }),
      );
    });

    it('throws NotFoundException when updating non-existent equipment', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(equipmentId, { name: 'Updated Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes equipment when found', async () => {
      repository.findOne.mockResolvedValue(mockEquipment);
      repository.remove.mockResolvedValue(mockEquipment);

      await service.remove(equipmentId);

      expect(repository.remove).toHaveBeenCalledWith(mockEquipment);
    });

    it('throws NotFoundException when removing non-existent equipment', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(equipmentId)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
