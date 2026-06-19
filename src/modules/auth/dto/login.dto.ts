import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsCompanyEmail } from '../../../common/validators/is-company-email.decorator';

export class LoginDto {
  @ApiProperty({ example: 'user@ministryofprogramming.com' })
  @IsEmail()
  @IsCompanyEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
