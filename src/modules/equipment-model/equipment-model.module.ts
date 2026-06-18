import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentCategory } from '../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from './entities/equipment-model.entity';
import { CatalogService } from './services/catalog.service';
import { EquipmentModelService } from './services/equipment-model.service';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentModel, EquipmentCategory])],
  providers: [EquipmentModelService, CatalogService],
  exports: [EquipmentModelService, CatalogService, TypeOrmModule],
})
export class EquipmentModelModule {}
