import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentCategory } from '../entities/equipment-category.entity';
import { CreateEquipmentCategoryDto } from '../dto/create-equipment-category.dto';

@Injectable()
export class EquipmentCategoryService {
  constructor(
    @InjectRepository(EquipmentCategory)
    private readonly categoryRepository: Repository<EquipmentCategory>,
  ) {}

  findAll(): Promise<EquipmentCategory[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<EquipmentCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    return category;
  }

  create(dto: CreateEquipmentCategoryDto): Promise<EquipmentCategory> {
    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }
}
