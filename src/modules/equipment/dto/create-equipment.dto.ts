import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EquipmentStatus } from '../entities/equipment.entity';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'MacBook Pro 14"' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Computer' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ example: 'M3, 16GB RAM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: EquipmentStatus,
    example: EquipmentStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
}
