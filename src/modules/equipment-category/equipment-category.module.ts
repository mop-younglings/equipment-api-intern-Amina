import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentCategoryController } from './controllers/equipment-category.controller';
import { EquipmentCategory } from './entities/equipment-category.entity';
import { EquipmentCategoryService } from './services/equipment-category.service';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentCategory])],
  controllers: [EquipmentCategoryController],
  providers: [EquipmentCategoryService],
  exports: [EquipmentCategoryService, TypeOrmModule],
})
export class EquipmentCategoryModule {}
