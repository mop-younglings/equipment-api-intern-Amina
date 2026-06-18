import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { DepartmentModule } from '../department/department.module';
import { Employee } from '../employee/entities/employee.entity';
import { Department } from '../department/entities/department.entity';

@Module({
  imports: [DepartmentModule, TypeOrmModule.forFeature([Employee, Department])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
