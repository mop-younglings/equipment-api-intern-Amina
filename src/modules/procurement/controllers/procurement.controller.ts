import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { MinRole } from '../../auth/decorators/min-role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { RequestService } from '../../request/services/request.service';
import { SuggestAlternativeDto } from '../dto/procurement.dto';
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

@ApiTags('request-alternatives')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole(EmployeeRole.PROCUREMENT_MANAGER)
@Controller('requests')
export class RequestAlternativeController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post(':id/alternatives')
  suggestAlternative(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuggestAlternativeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.procurementService.suggestAlternative(id, user, dto);
  }
}
