import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EquipmentAssignmentController,
  ManagerController,
} from './controllers/equipment-assignment.controller';
import { EquipmentAssignment } from './entities/equipment-assignment.entity';
import { EquipmentAssignmentService } from './services/equipment-assignment.service';
import { EquipmentAsset } from '../equipment-asset/entities/equipment-asset.entity';
import { Employee } from '../employee/entities/employee.entity';
import { NotificationModule } from '../notification/notification.module';
import { RequestModule } from '../request/request.module';

@Module({
  imports: [
    forwardRef(() => RequestModule),
    NotificationModule,
    TypeOrmModule.forFeature([EquipmentAssignment, EquipmentAsset, Employee]),
  ],
  controllers: [EquipmentAssignmentController, ManagerController],
  providers: [EquipmentAssignmentService],
  exports: [EquipmentAssignmentService, TypeOrmModule],
})
export class EquipmentAssignmentModule {}
