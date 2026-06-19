import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Short-lived JWT used as Bearer token on protected routes.',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'base64url-encoded-refresh-token',
    description: 'Long-lived token used to obtain a new access token pair.',
  })
  refreshToken!: string;
}
