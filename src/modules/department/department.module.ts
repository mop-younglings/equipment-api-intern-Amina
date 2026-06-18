import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employee/entities/employee.entity';
import { Department } from './entities/department.entity';
import { DepartmentService } from './services/department.service';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Employee])],
  providers: [DepartmentService],
  exports: [DepartmentService, TypeOrmModule],
})
export class DepartmentModule {}
