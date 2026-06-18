import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ProcurementController,
  RequestAlternativeController,
} from './controllers/procurement.controller';
import { ProcurementService } from './services/procurement.service';
import { EquipmentAsset } from '../equipment-asset/entities/equipment-asset.entity';
import { EquipmentModel } from '../equipment-model/entities/equipment-model.entity';
import { Employee } from '../employee/entities/employee.entity';
import { NotificationModule } from '../notification/notification.module';
import { RequestModule } from '../request/request.module';
import { EquipmentRequest } from '../request/entities/equipment-request.entity';
import { RequestAlternative } from '../request/entities/request-alternative.entity';

@Module({
  imports: [
    RequestModule,
    NotificationModule,
    TypeOrmModule.forFeature([
      EquipmentRequest,
      RequestAlternative,
      EquipmentModel,
      EquipmentAsset,
      Employee,
    ]),
  ],
  controllers: [ProcurementController, RequestAlternativeController],
  providers: [ProcurementService],
  exports: [ProcurementService, TypeOrmModule],
})
export class ProcurementModule {}
