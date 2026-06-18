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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  getCatalog() {
    return this.catalogService.getCatalog();
  }

  @Get('catalog/similar')
  findSimilar(
    @Query('q') query: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.catalogService.findSimilar(query ?? '', categoryId);
  }

  @Get('models/:id')
  findModel(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogService.findModelById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @MinRole(EmployeeRole.PROCUREMENT_MANAGER)
  @Get('models/:id/similar')
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
  getInventory() {
    return this.assetService.findAll();
  }

  @Get('inventory/stats')
  getStats() {
    return this.assetService.getInventoryStats();
  }

  @Get('equipment-models')
  findModels() {
    return this.modelService.findAll();
  }

  @Post('equipment-models')
  createModel(@Body() dto: CreateEquipmentModelDto) {
    return this.modelService.create(dto);
  }

  @Patch('equipment-models/:id')
  updateModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentModelDto,
  ) {
    return this.modelService.update(id, dto);
  }

  @Get('equipment-assets')
  findAssets() {
    return this.assetService.findAll();
  }

  @Post('equipment-assets')
  createAsset(@Body() dto: CreateEquipmentAssetDto) {
    return this.assetService.create(dto);
  }

  @Patch('equipment-assets/:id')
  updateAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentAssetDto,
  ) {
    return this.assetService.update(id, dto);
  }

  @Patch('equipment-assets/:id/status')
  updateAssetStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentAssetStatusDto,
  ) {
    return this.assetService.updateStatus(id, dto);
  }

  @Post('equipment-assets/:id/assign')
  assignAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignEquipmentAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assetService.assign(id, dto, user);
  }

  @Delete('equipment-assets/:id')
  deleteAsset(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetService.remove(id);
  }

  @Patch('equipment-assets/:id/retire')
  retireAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assetService.retire(id, user);
  }
}
