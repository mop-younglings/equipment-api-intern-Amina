import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { Equipment } from './entities/equipment.entity';
import { EquipmentService } from './equipment.service';

@ApiTags('Equipment')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'List all equipment' })
  @ApiOkResponse({ description: 'List of equipment items', type: [Equipment] })
  findAll(): Equipment[] {
    return this.equipmentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiOkResponse({ description: 'Equipment item', type: Equipment })
  @ApiNotFoundResponse({ description: 'Equipment not found' })
  findOne(@Param('id') id: string): Equipment {
    return this.equipmentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create equipment' })
  @ApiCreatedResponse({ description: 'Created equipment item', type: Equipment })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  create(@Body() createEquipmentDto: CreateEquipmentDto): Equipment {
    return this.equipmentService.create(createEquipmentDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update equipment by ID' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiOkResponse({ description: 'Updated equipment item', type: Equipment })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Equipment not found' })
  update(
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
  ): Equipment {
    return this.equipmentService.update(id, updateEquipmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete equipment by ID' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiNoContentResponse({ description: 'Equipment deleted' })
  @ApiNotFoundResponse({ description: 'Equipment not found' })
  remove(@Param('id') id: string): void {
    return this.equipmentService.remove(id);
  }
}
