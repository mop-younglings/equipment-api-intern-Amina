import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementController } from './controllers/procurement.controller';
import { ProcurementService } from './services/procurement.service';
import { EquipmentAsset } from '../equipment-asset/entities/equipment-asset.entity';
import { RequestModule } from '../request/request.module';
import { EquipmentRequest } from '../request/entities/equipment-request.entity';

@Module({
  imports: [
    RequestModule,
    TypeOrmModule.forFeature([EquipmentRequest, EquipmentAsset]),
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService, TypeOrmModule],
})
export class ProcurementModule {}
