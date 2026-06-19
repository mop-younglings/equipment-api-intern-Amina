import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MinRole } from '../../auth/decorators/min-role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '../../department/dto/department.dto';
import { DepartmentService } from '../../department/services/department.service';
import {
  CreateAdminUserDto,
  ResetPasswordDto,
  UpdateAdminUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from '../dto/admin.dto';
import { AdminService } from '../services/admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole(EmployeeRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly departmentService: DepartmentService,
  ) {}

  @Get('users')
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns every employee account with department details. Admin only.',
  })
  findUsers() {
    return this.adminService.findAllUsers();
  }

  @Post('users')
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Creates a new employee account with optional role, status, and department. Admin only.',
  })
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get a user by ID',
    description: 'Returns a single employee account. Admin only.',
  })
  findUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({
    summary: 'Update a user',
    description:
      'Updates profile fields such as name, email, or department. Admin only.',
  })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Change a user role',
    description:
      'Updates the employee role (employee, direct manager, etc.). Admin only.',
  })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateRole(id, dto);
  }

  @Patch('users/:id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a user',
    description: 'Sets account status to active or inactive. Admin only.',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateStatus(id, dto);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({
    summary: 'Reset a user password',
    description: 'Sets a new password for the specified user. Admin only.',
  })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.adminService.resetPassword(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Permanently removes an employee account. Admin only.',
  })
  removeUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.removeUser(id);
  }

  @Get('departments')
  @ApiOperation({
    summary: 'List all departments',
    description:
      'Returns departments with direct managers and employees. Admin only.',
  })
  findDepartments() {
    return this.departmentService.findAll();
  }

  @Post('departments')
  @ApiOperation({
    summary: 'Create a department',
    description:
      'Creates a department with an optional direct manager. Admin only.',
  })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Patch('departments/:id')
  @ApiOperation({
    summary: 'Update a department',
    description:
      'Updates department name or direct manager assignment. Admin only.',
  })
  updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, dto);
  }

  @Delete('departments/:id')
  @ApiOperation({
    summary: 'Delete a department',
    description: 'Permanently removes a department. Admin only.',
  })
  removeDepartment(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.remove(id);
  }
}
