import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'Authenticate user' })
  @ApiOkResponse({ description: 'JWT access token' })
  login(@Body() loginDto: LoginDto) {
    return { accessToken: 'stub-token', email: loginDto.email };
  }
}
