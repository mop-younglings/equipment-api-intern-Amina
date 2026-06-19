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
import { MinRole } from '../../auth/decorators/min-role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { RequestService } from '../../request/services/request.service';
import { ReturnRequestDto } from '../dto/return-request.dto';
import { EquipmentAssignmentService } from '../services/equipment-assignment.service';

@ApiTags('equipment-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment-assignments')
export class EquipmentAssignmentController {
  constructor(private readonly assignmentService: EquipmentAssignmentService) {}

  @Get('my')
  @ApiOperation({
    summary: 'List my equipment assignments',
    description:
      'Returns equipment currently or previously assigned to the authenticated user.',
  })
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findMyAssignments(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an assignment by ID',
    description: 'Returns assignment details including asset and employee.',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentService.findOne(id, user);
  }

  @MinRole(EmployeeRole.DIRECT_MANAGER)
  @Post(':id/return-request')
  @ApiOperation({
    summary: 'Request equipment return',
    description: 'Manager requests that an employee return assigned equipment.',
  })
  requestReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentService.requestReturn(id, user, dto);
  }

  @Patch(':id/complete-return')
  @ApiOperation({
    summary: 'Complete equipment return',
    description:
      'Marks a return as completed and updates asset and assignment status.',
  })
  completeReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentService.completeReturn(id, user);
  }
}

@ApiTags('manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole(EmployeeRole.DIRECT_MANAGER)
@Controller('manager')
export class ManagerController {
  constructor(
    private readonly assignmentService: EquipmentAssignmentService,
    private readonly requestService: RequestService,
  ) {}

  @Get('requests/pending')
  @ApiOperation({
    summary: 'List pending team requests',
    description: 'Returns team requests awaiting direct manager approval.',
  })
  pendingRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.requestService.findManagerPending(user);
  }

  @Get('requests')
  @ApiOperation({
    summary: 'List all team requests',
    description:
      'Returns all equipment requests from employees in managed departments.',
  })
  allRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.requestService.findManagerRequests(user);
  }

  @Get('team-equipment')
  @ApiOperation({
    summary: 'List team equipment assignments',
    description: 'Returns active equipment assignments for the manager team.',
  })
  teamEquipment(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findTeamEquipment(user);
  }
}
