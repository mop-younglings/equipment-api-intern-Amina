import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateRequestDto } from '../dto/create-request.dto';
import { EquipmentRequest } from '../entities/equipment-request.entity';
import { RequestService } from '../services/request.service';

@ApiTags('Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Get()
  @ApiOperation({
    summary: 'List equipment requests',
    description:
      'Returns all requests for admins. Regular users see only their own requests.',
  })
  @ApiOkResponse({
    description: 'List of equipment requests with approval steps',
    type: [EquipmentRequest],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<EquipmentRequest[]> {
    return this.requestService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment request by ID' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Equipment request with approval history',
    type: EquipmentRequest,
  })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiForbiddenResponse({ description: 'Not authorized to view this request' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EquipmentRequest> {
    return this.requestService.findOne(id, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an equipment request',
    description:
      'Submits a request for available equipment. Creates a single manager approval step for standard items, or manager + admin steps for high-value items (≥ $1,000).',
  })
  @ApiCreatedResponse({
    description: 'Created request with pending approval steps',
    type: EquipmentRequest,
  })
  @ApiBadRequestResponse({
    description:
      'Equipment unavailable, no manager assigned, or validation failed',
  })
  @ApiNotFoundResponse({ description: 'Equipment not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EquipmentRequest> {
    return this.requestService.create(createRequestDto, user);
  }
}
