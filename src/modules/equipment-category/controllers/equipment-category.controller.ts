import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MinRole } from '../../auth/decorators/min-role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { CreateEquipmentCategoryDto } from '../dto/create-equipment-category.dto';
import { EquipmentCategoryService } from '../services/equipment-category.service';

@ApiTags('equipment-categories')
@Controller('equipment-categories')
export class EquipmentCategoryController {
  constructor(private readonly categoryService: EquipmentCategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @MinRole(EmployeeRole.PROCUREMENT_MANAGER)
  @Post()
  create(@Body() dto: CreateEquipmentCategoryDto) {
    return this.categoryService.create(dto);
  }
}
