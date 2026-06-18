import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { EquipmentAsset } from '../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssignment } from '../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentRequest } from '../request/entities/equipment-request.entity';
import { ApprovalController } from './controllers/approval.controller';
import { ApprovalStep } from './entities/approval-step.entity';
import { ApprovalService } from './services/approval.service';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      ApprovalStep,
      EquipmentRequest,
      EquipmentAsset,
      EquipmentAssignment,
    ]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
