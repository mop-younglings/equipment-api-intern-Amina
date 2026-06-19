import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CancelRequestDto } from '../dto/cancel-request.dto';
import { CreateRequestDto } from '../dto/create-request.dto';
import { RequestService } from '../services/request.service';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an equipment request',
    description:
      'Submits a loan or procurement request and starts the manager approval workflow.',
  })
  create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.create(createRequestDto, user);
  }

  @Get('my')
  @ApiOperation({
    summary: 'List my requests',
    description:
      'Returns all equipment requests submitted by the authenticated user.',
  })
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.requestService.findMyRequests(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a request by ID',
    description:
      'Returns request details including approval steps. Access is limited to the requester, their managers, procurement, or admin.',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.findOne(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a pending request',
    description:
      'Cancels a request while it is still pending manager or procurement approval.',
  })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.cancel(id, user, cancelDto);
  }

  @Get(':id/timeline')
  @ApiOperation({
    summary: 'Get request approval timeline',
    description:
      'Returns approval steps, statuses, and related assignments for a request.',
  })
  timeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.getTimeline(id, user);
  }
}
