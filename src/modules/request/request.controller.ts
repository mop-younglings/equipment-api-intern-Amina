import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateRequestDto } from './dto/create-request.dto';

@ApiTags('Requests')
@Controller('requests')
export class RequestController {
  @Get()
  @ApiOperation({ summary: 'List equipment requests' })
  @ApiOkResponse({ description: 'List of requests' })
  findAll() {
    return [];
  }

  @Post()
  @ApiOperation({ summary: 'Create an equipment request' })
  @ApiCreatedResponse({ description: 'Created request' })
  create(@Body() createRequestDto: CreateRequestDto) {
    return { id: '1', status: 'pending', ...createRequestDto };
  }
}
