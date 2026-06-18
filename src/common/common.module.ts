import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../modules/department/entities/department.entity';
import { Employee } from '../modules/employee/entities/employee.entity';
import { AccessControlService } from './services/access-control.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Department, Employee])],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class CommonModule {}
