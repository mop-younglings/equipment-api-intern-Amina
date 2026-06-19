import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DepartmentModule } from '../department/department.module';
import { Department } from '../department/entities/department.entity';
import { Employee } from '../employee/entities/employee.entity';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';

@Module({
  imports: [
    AuthModule,
    DepartmentModule,
    TypeOrmModule.forFeature([Employee, Department]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
