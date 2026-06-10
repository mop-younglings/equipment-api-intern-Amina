import { Module } from '@nestjs/common';
import { ApprovalModule } from './modules/approval/approval.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { RequestModule } from './modules/request/request.module';

@Module({
  imports: [
    AuthModule,
    EmployeeModule,
    EquipmentModule,
    RequestModule,
    ApprovalModule,
  ],
})
export class AppModule {}
