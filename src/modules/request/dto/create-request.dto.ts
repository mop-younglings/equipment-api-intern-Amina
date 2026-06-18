import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestType } from '../enums/request-type.enum';

export class CreateRequestDto {
  @ApiProperty({ enum: RequestType })
  @IsEnum(RequestType)
  requestType!: RequestType;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateRequestDto) => dto.requestType === RequestType.LOAN)
  @IsUUID()
  equipmentModelId?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (dto: CreateRequestDto) => dto.requestType === RequestType.PROCUREMENT,
  )
  @IsString()
  requestedItemName?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (dto: CreateRequestDto) => dto.requestType === RequestType.PROCUREMENT,
  )
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  endDate!: string;

  @ApiProperty()
  @IsString()
  purpose!: string;
}
