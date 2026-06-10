import { ApiProperty } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({ example: '1' })
  equipmentId!: string;

  @ApiProperty({ example: 'Need a laptop for new hire' })
  reason!: string;
}
