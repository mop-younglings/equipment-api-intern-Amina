import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EquipmentStatus } from '../enums/equipment-status.enum';

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

  @ApiPropertyOptional({ example: 2499.99 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;
}
