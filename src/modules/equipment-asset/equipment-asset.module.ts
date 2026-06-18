import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CatalogController,
  InventoryController,
} from './controllers/inventory.controller';
import { EquipmentAsset } from './entities/equipment-asset.entity';
import { EquipmentAssetService } from './services/equipment-asset.service';
import { Employee } from '../employee/entities/employee.entity';
import { EquipmentAssignment } from '../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentModel } from '../equipment-model/entities/equipment-model.entity';
import { EquipmentRequest } from '../request/entities/equipment-request.entity';
import { EquipmentModelModule } from '../equipment-model/equipment-model.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    EquipmentModelModule,
    NotificationModule,
    TypeOrmModule.forFeature([
      EquipmentAsset,
      EquipmentModel,
      EquipmentAssignment,
      EquipmentRequest,
      Employee,
    ]),
  ],
  controllers: [CatalogController, InventoryController],
  providers: [EquipmentAssetService],
  exports: [EquipmentAssetService, TypeOrmModule],
})
export class EquipmentAssetModule {}
