import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SuggestAlternativeDto {
  @ApiProperty()
  @IsUUID()
  equipmentModelId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
