import { Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalController {
  @Get()
  @ApiOperation({ summary: 'List pending approvals' })
  @ApiOkResponse({ description: 'List of pending approvals' })
  findAll() {
    return [];
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a request' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiOkResponse({ description: 'Approved request' })
  approve(@Param('id') id: string) {
    return { id, status: 'approved' };
  }
}
