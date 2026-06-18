import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApprovalActionDto } from '../dto/approval-action.dto';
import { ApprovalService } from '../services/approval.service';

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('my')
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalService.findMyPending(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalService.findOne(id, user);
  }

  @Patch(':stepId/approve')
  approve(
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalService.approve(stepId, user, actionDto);
  }

  @Patch(':stepId/reject')
  reject(
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalService.reject(stepId, user, actionDto);
  }
}
