import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateEquipmentModelDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  procurementYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  releaseYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  expectedLifespanMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class UpdateEquipmentModelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  procurementYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  releaseYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  expectedLifespanMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
