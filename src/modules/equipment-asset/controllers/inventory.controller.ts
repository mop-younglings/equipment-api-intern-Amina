import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { MinRole } from '../../auth/decorators/min-role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { CatalogService } from '../../equipment-model/services/catalog.service';
import {
  CreateEquipmentModelDto,
  UpdateEquipmentModelDto,
} from '../../equipment-model/dto/equipment-model.dto';
import { EquipmentModelService } from '../../equipment-model/services/equipment-model.service';
import {
  AssignEquipmentAssetDto,
  CreateEquipmentAssetDto,
  UpdateEquipmentAssetDto,
  UpdateEquipmentAssetStatusDto,
} from '../dto/equipment-asset.dto';
import { EquipmentAssetService } from '../services/equipment-asset.service';

@ApiTags('equipment')
@Controller('equipment')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly modelService: EquipmentModelService,
  ) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'Browse equipment catalog',
    description:
      'Returns equipment models with availability counts for employees.',
  })
  getCatalog() {
    return this.catalogService.getCatalog();
  }

  @Get('catalog/similar')
  @ApiOperation({
    summary: 'Search similar available models',
    description:
      'Finds available models matching a search query and optional category.',
  })
  findSimilar(
    @Query('q') query: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.catalogService.findSimilar(query ?? '', categoryId);
  }

  @Get('models/:id')
  @ApiOperation({
    summary: 'Get equipment model details',
    description:
      'Returns a single equipment model with category and availability.',
  })
  findModel(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogService.findModelById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @MinRole(EmployeeRole.PROCUREMENT_MANAGER)
  @Get('models/:id/similar')
  @ApiOperation({
    summary: 'Find similar models for procurement',
    description:
      'Returns models similar to the given model. Procurement manager access required.',
  })
  findSimilarModels(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogService.findSimilarModels(id);
  }
}

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole(EmployeeRole.PROCUREMENT_MANAGER)
@Controller()
export class InventoryController {
  constructor(
    private readonly assetService: EquipmentAssetService,
    private readonly modelService: EquipmentModelService,
  ) {}

  @Get('inventory')
  @ApiOperation({
    summary: 'List all equipment assets',
    description:
      'Returns the full physical inventory with models and assignees.',
  })
  getInventory() {
    return this.assetService.findAll();
  }

  @Get('inventory/stats')
  @ApiOperation({
    summary: 'Get inventory statistics',
    description: 'Returns asset counts by status and low-stock model alerts.',
  })
  getStats() {
    return this.assetService.getInventoryStats();
  }

  @Get('equipment-models')
  @ApiOperation({
    summary: 'List equipment models',
    description: 'Returns all equipment models in the catalog.',
  })
  findModels() {
    return this.modelService.findAll();
  }

  @Post('equipment-models')
  @ApiOperation({
    summary: 'Create an equipment model',
    description: 'Adds a new equipment model to the catalog.',
  })
  createModel(@Body() dto: CreateEquipmentModelDto) {
    return this.modelService.create(dto);
  }

  @Patch('equipment-models/:id')
  @ApiOperation({
    summary: 'Update an equipment model',
    description:
      'Updates model details such as name, category, or stock threshold.',
  })
  updateModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentModelDto,
  ) {
    return this.modelService.update(id, dto);
  }

  @Get('equipment-assets')
  @ApiOperation({
    summary: 'List equipment assets',
    description: 'Returns all physical equipment assets in inventory.',
  })
  findAssets() {
    return this.assetService.findAll();
  }

  @Post('equipment-assets')
  @ApiOperation({
    summary: 'Create an equipment asset',
    description:
      'Registers a new physical asset with a unique asset tag under an equipment model.',
  })
  createAsset(@Body() dto: CreateEquipmentAssetDto) {
    return this.assetService.create(dto);
  }

  @Patch('equipment-assets/:id')
  @ApiOperation({
    summary: 'Update an equipment asset',
    description: 'Updates asset tag, serial number, or notes.',
  })
  updateAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentAssetDto,
  ) {
    return this.assetService.update(id, dto);
  }

  @Patch('equipment-assets/:id/status')
  @ApiOperation({
    summary: 'Update equipment asset status',
    description:
      'Changes asset status (available, in use, maintenance, retired, etc.).',
  })
  updateAssetStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentAssetStatusDto,
  ) {
    return this.assetService.updateStatus(id, dto);
  }

  @Post('equipment-assets/:id/assign')
  @ApiOperation({
    summary: 'Assign an equipment asset',
    description:
      'Assigns an available asset to an employee and optionally links it to a request.',
  })
  assignAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignEquipmentAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assetService.assign(id, dto, user);
  }

  @Delete('equipment-assets/:id')
  @ApiOperation({
    summary: 'Delete an equipment asset',
    description:
      'Hard-deletes an unused asset or a retired asset after the grace period.',
  })
  deleteAsset(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetService.remove(id);
  }

  @Patch('equipment-assets/:id/retire')
  @ApiOperation({
    summary: 'Retire an equipment asset',
    description:
      'Marks an asset as retired and clears active assignment fields.',
  })
  retireAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assetService.retire(id, user);
  }
}
