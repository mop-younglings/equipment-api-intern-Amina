import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { ApprovalActionDto } from '../dto/approval-action.dto';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApprovalService } from '../services/approval.service';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get()
  @ApiOperation({
    summary: 'List pending approvals for current user',
    description:
      'Returns approval steps assigned to the authenticated user that are ready to action (previous levels completed).',
  })
  @ApiOkResponse({
    description: 'Pending approval steps with request details',
    type: [ApprovalStep],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  findPending(@CurrentUser() user: AuthenticatedUser): Promise<ApprovalStep[]> {
    return this.approvalService.findPendingForUser(user.id);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Approve a request at the current approval level',
    description:
      'Approves the given step. For multi-level requests, advances to the next level or finalizes the request and assigns equipment.',
  })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Approval step ID',
  })
  @ApiOkResponse({
    description: 'Updated approval step',
    type: ApprovalStep,
  })
  @ApiBadRequestResponse({
    description: 'Step already processed or previous levels incomplete',
  })
  @ApiForbiddenResponse({ description: 'Not the designated approver' })
  @ApiNotFoundResponse({ description: 'Approval step not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  approve(
    @Param('id') id: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApprovalStep> {
    return this.approvalService.approve(id, user, actionDto);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Reject a request at the current approval level',
    description:
      'Rejects the request, records an optional comment, and cancels remaining approval steps.',
  })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Approval step ID',
  })
  @ApiOkResponse({
    description: 'Updated approval step',
    type: ApprovalStep,
  })
  @ApiBadRequestResponse({
    description: 'Step already processed or previous levels incomplete',
  })
  @ApiForbiddenResponse({ description: 'Not the designated approver' })
  @ApiNotFoundResponse({ description: 'Approval step not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  reject(
    @Param('id') id: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApprovalStep> {
    return this.approvalService.reject(id, user, actionDto);
  }
}
