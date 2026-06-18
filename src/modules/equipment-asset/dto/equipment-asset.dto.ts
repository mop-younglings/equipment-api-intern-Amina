import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentAssetStatus } from '../enums/equipment-asset-status.enum';

export class CreateEquipmentAssetDto {
  @ApiProperty()
  @IsUUID()
  equipmentModelId!: string;

  @ApiProperty()
  @IsString()
  assetTag!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: EquipmentAssetStatus })
  @IsOptional()
  @IsEnum(EquipmentAssetStatus)
  status?: EquipmentAssetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEquipmentAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetTag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEquipmentAssetStatusDto {
  @ApiProperty({ enum: EquipmentAssetStatus })
  @IsEnum(EquipmentAssetStatus)
  status!: EquipmentAssetStatus;
}

export class AssignEquipmentAssetDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedReturnDate?: string;
}
