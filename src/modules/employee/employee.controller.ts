import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Employees')
@Controller('employees')
export class EmployeeController {
  @Get()
  @ApiOperation({ summary: 'List all employees' })
  @ApiOkResponse({ description: 'List of employees' })
  findAll() {
    return [];
  }
}
