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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  findUsers() {
    return this.adminService.findAllUsers();
  }

  @Post('users')
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users/:id')
  findUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateRole(id, dto);
  }

  @Patch('users/:id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateStatus(id, dto);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.adminService.resetPassword(id, dto);
  }

  @Delete('users/:id')
  removeUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.removeUser(id);
  }

  @Get('departments')
  findDepartments() {
    return this.departmentService.findAll();
  }

  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, dto);
  }

  @Delete('departments/:id')
  removeDepartment(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.remove(id);
  }
}
