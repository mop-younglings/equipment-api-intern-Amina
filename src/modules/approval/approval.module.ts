import { Module } from '@nestjs/common';
import { ApprovalController } from './controllers/approval.controller';

@Module({
  controllers: [ApprovalController],
})
export class ApprovalModule {}
