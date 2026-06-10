import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EquipmentStatus } from '../entities/equipment.entity';

export class UpdateEquipmentDto {
  @ApiPropertyOptional({ example: 'MacBook Pro 14"' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Computer' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'M3, 16GB RAM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: EquipmentStatus,
    example: EquipmentStatus.IN_USE,
  })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
}
