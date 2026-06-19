import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'base64url-encoded-refresh-token',
    description:
      'Refresh token returned from login or a previous refresh call.',
  })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
