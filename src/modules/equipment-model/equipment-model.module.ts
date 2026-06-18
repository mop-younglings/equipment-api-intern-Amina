import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentAsset } from '../equipment-asset/entities/equipment-asset.entity';
import { EquipmentCategory } from '../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from './entities/equipment-model.entity';
import { CatalogService } from './services/catalog.service';
import { EquipmentModelService } from './services/equipment-model.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentModel,
      EquipmentCategory,
      EquipmentAsset,
    ]),
  ],
  providers: [EquipmentModelService, CatalogService],
  exports: [EquipmentModelService, CatalogService, TypeOrmModule],
})
export class EquipmentModelModule {}
