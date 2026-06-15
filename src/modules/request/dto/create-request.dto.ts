import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRequestDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the equipment being requested',
  })
  @IsUUID()
  equipmentId!: string;

  @ApiProperty({ example: 'Need a laptop for new hire onboarding' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
