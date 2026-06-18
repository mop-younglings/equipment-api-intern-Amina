import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApprovalRole } from '../enums/approval-role.enum';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';

@Injectable()
export class ApprovalWorkflowService {
  async createInitialManagerApprovalStep(
    manager: EntityManager,
    request: EquipmentRequest,
    directManager: Employee,
  ): Promise<ApprovalStep> {
    const stepRepo = manager.getRepository(ApprovalStep);

    const managerStep = stepRepo.create({
      request,
      level: 1,
      approver: directManager,
      approverRole: ApprovalRole.DIRECT_MANAGER,
      status: ApprovalStepStatus.PENDING,
    });

    return stepRepo.save(managerStep);
  }
}
