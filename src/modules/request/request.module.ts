import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalStep } from '../approval/entities/approval-step.entity';
import { AuthModule } from '../auth/auth.module';
import { Employee } from '../employee/entities/employee.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { NotificationModule } from '../notification/notification.module';
import { RequestController } from './controllers/request.controller';
import { EquipmentRequest } from './entities/equipment-request.entity';
import { RequestService } from './services/request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentRequest,
      ApprovalStep,
      Equipment,
      Employee,
    ]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [RequestController],
  providers: [RequestService],
  exports: [RequestService],
})
export class RequestModule {}
