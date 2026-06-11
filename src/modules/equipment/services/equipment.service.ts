import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { Equipment } from '../entities/equipment.entity';
import { EquipmentStatus } from '../enums/equipment-status.enum';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  findAll(): Promise<Equipment[]> {
    return this.equipmentRepository.find({
      relations: { assignedEmployee: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Equipment> {
    const item = await this.equipmentRepository.findOne({
      where: { id },
      relations: { assignedEmployee: true },
    });

    if (!item) {
      throw new NotFoundException(`Equipment with id "${id}" not found`);
    }

    return item;
  }

  async create(createEquipmentDto: CreateEquipmentDto): Promise<Equipment> {
    const item = this.equipmentRepository.create({
      name: createEquipmentDto.name,
      category: createEquipmentDto.category,
      description: createEquipmentDto.description,
      status: createEquipmentDto.status ?? EquipmentStatus.AVAILABLE,
    });

    return this.equipmentRepository.save(item);
  }

  async update(
    id: string,
    updateEquipmentDto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    const item = await this.findOne(id);

    Object.assign(item, updateEquipmentDto);

    return this.equipmentRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.equipmentRepository.remove(item);
  }
}
