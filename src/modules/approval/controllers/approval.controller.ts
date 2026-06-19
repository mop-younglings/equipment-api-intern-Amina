import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'List my pending approvals',
    description: 'Returns approval steps assigned to the authenticated user.',
  })
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalService.findMyPending(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an approval step by ID',
    description: 'Returns approval step details with the related request.',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalService.findOne(id, user);
  }

  @Patch(':stepId/approve')
  @ApiOperation({
    summary: 'Approve an approval step',
    description:
      'Approves the current workflow step and advances the request to the next stage.',
  })
  approve(
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalService.approve(stepId, user, actionDto);
  }

  @Patch(':stepId/reject')
  @ApiOperation({
    summary: 'Reject an approval step',
    description:
      'Rejects the current workflow step. A rejection reason is required.',
  })
  reject(
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalService.reject(stepId, user, actionDto);
  }
}
