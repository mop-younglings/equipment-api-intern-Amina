import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { Equipment } from '../equipment/entities/equipment.entity';
import { EquipmentRequest } from '../request/entities/equipment-request.entity';
import { ApprovalController } from './controllers/approval.controller';
import { ApprovalStep } from './entities/approval-step.entity';
import { ApprovalService } from './services/approval.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalStep, EquipmentRequest, Equipment]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
