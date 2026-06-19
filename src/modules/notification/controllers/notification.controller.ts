import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { Notification } from '../entities/notification.entity';
import { NotificationService } from '../services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'List notifications for the current user',
    description: 'Returns all notifications ordered by most recent first.',
  })
  @ApiOkResponse({
    description: 'List of notifications',
    type: [Notification],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Notification[]> {
    return this.notificationService.findAllForUser(user.id);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count for the current user',
  })
  @ApiOkResponse({
    description: 'Unread notification count',
    schema: {
      type: 'object',
      properties: { count: { type: 'number', example: 3 } },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async unreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.countUnreadForUser(user.id);
    return { count };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark all notifications as read for the current user',
  })
  @ApiOkResponse({ description: 'All notifications marked as read' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.notificationService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description:
      'Marks a single notification as read for the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'Updated notification', type: Notification })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Notification> {
    return this.notificationService.markAsRead(id, user.id);
  }
}
