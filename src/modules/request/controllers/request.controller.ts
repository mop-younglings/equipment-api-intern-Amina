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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.create(createRequestDto, user);
  }

  @Get('my')
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.requestService.findMyRequests(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.findOne(id, user);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.cancel(id, user, cancelDto);
  }

  @Get(':id/timeline')
  timeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestService.getTimeline(id, user);
  }
}
