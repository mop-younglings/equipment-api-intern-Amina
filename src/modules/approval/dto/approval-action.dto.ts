import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovalActionDto {
  @ApiPropertyOptional({
    example: 'Approved for Q2 onboarding — budget confirmed',
    description:
      'Optional comment explaining the approval or rejection decision',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
