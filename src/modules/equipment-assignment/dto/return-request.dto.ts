import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReturnRequestDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  returnByDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
