import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentModel } from '../entities/equipment-model.entity';
import {
  CreateEquipmentModelDto,
  UpdateEquipmentModelDto,
} from '../dto/equipment-model.dto';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';

@Injectable()
export class EquipmentModelService {
  constructor(
    @InjectRepository(EquipmentModel)
    private readonly modelRepository: Repository<EquipmentModel>,
    @InjectRepository(EquipmentCategory)
    private readonly categoryRepository: Repository<EquipmentCategory>,
  ) {}

  findAll(): Promise<EquipmentModel[]> {
    return this.modelRepository.find({
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EquipmentModel> {
    const model = await this.modelRepository.findOne({
      where: { id },
      relations: { category: true, assets: true },
    });
    if (!model) {
      throw new NotFoundException(`Equipment model with id "${id}" not found`);
    }
    return model;
  }

  async create(dto: CreateEquipmentModelDto): Promise<EquipmentModel> {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const model = this.modelRepository.create({
      name: dto.name,
      category,
      description: dto.description,
      defaultValue: dto.defaultValue ?? 0,
      procurementYear: dto.procurementYear,
      releaseYear: dto.releaseYear,
      expectedLifespanMonths: dto.expectedLifespanMonths,
      lowStockThreshold: dto.lowStockThreshold ?? 1,
    });

    return this.modelRepository.save(model);
  }

  async update(
    id: string,
    dto: UpdateEquipmentModelDto,
  ): Promise<EquipmentModel> {
    const model = await this.findOne(id);
    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      model.category = category;
    }
    Object.assign(model, {
      name: dto.name ?? model.name,
      description: dto.description ?? model.description,
      defaultValue: dto.defaultValue ?? model.defaultValue,
      procurementYear: dto.procurementYear ?? model.procurementYear,
      releaseYear: dto.releaseYear ?? model.releaseYear,
      expectedLifespanMonths:
        dto.expectedLifespanMonths ?? model.expectedLifespanMonths,
      lowStockThreshold: dto.lowStockThreshold ?? model.lowStockThreshold,
    });
    return this.modelRepository.save(model);
  }
}
