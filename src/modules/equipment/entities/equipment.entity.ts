import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EquipmentStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
}

export class Equipment {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'MacBook Pro 14"' })
  name!: string;

  @ApiProperty({ example: 'Computer' })
  category!: string;

  @ApiPropertyOptional({ example: 'M3, 16GB RAM' })
  description?: string;

  @ApiProperty({ enum: EquipmentStatus, example: EquipmentStatus.AVAILABLE })
  status!: EquipmentStatus;
}
