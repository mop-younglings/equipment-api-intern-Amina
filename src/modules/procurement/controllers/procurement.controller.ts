import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  pendingApprovals() {
    return this.requestService.findProcurementPending();
  }

  @Get('requests/:id/availability')
  checkAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.procurementService.checkAvailability(id);
  }
}
