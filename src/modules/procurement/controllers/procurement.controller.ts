import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MinRole } from '../../auth/decorators/min-role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { RequestService } from '../../request/services/request.service';
import { ProcurementService } from '../services/procurement.service';

@ApiTags('procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole(EmployeeRole.PROCUREMENT_MANAGER)
@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly procurementService: ProcurementService,
    private readonly requestService: RequestService,
  ) {}

  @Get('approvals')
  @ApiOperation({
    summary: 'List pending procurement approvals',
    description: 'Returns requests awaiting procurement manager review.',
  })
  pendingApprovals() {
    return this.requestService.findProcurementPending();
  }

  @Get('requests/:id/availability')
  @ApiOperation({
    summary: 'Check request asset availability',
    description:
      'Checks whether available inventory exists for a loan request equipment model.',
  })
  checkAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.procurementService.checkAvailability(id);
  }
}
