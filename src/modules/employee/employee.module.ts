import { Module } from '@nestjs/common';
import { EmployeeController } from './controllers/employee.controller';

@Module({
  controllers: [EmployeeController],
})
export class EmployeeModule {}
