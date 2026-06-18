import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccessControlService } from '../../../common/services/access-control.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentAssignmentStatus } from '../../equipment-assignment/enums/equipment-assignment-status.enum';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestStatus } from '../../request/enums/request-status.enum';
import { RequestType } from '../../request/enums/request-type.enum';
import { ApprovalActionDto } from '../dto/approval-action.dto';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApprovalRole } from '../enums/approval-role.enum';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalStep)
    private readonly approvalStepRepository: Repository<ApprovalStep>,
    @InjectRepository(EquipmentRequest)
    private readonly requestRepository: Repository<EquipmentRequest>,
    @InjectRepository(EquipmentAsset)
    private readonly assetRepository: Repository<EquipmentAsset>,
    @InjectRepository(EquipmentAssignment)
    private readonly assignmentRepository: Repository<EquipmentAssignment>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly accessControl: AccessControlService,
  ) {}

  findMyPending(userId: string): Promise<ApprovalStep[]> {
    return this.approvalStepRepository.find({
      where: { approver: { id: userId }, status: ApprovalStepStatus.PENDING },
      relations: {
        request: {
          requester: { department: true },
          equipmentModel: { category: true },
          category: true,
        },
        approver: true,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(
    stepId: string,
    user: AuthenticatedUser,
  ): Promise<ApprovalStep> {
    const step = await this.approvalStepRepository.findOne({
      where: { id: stepId },
      relations: {
        request: {
          requester: { department: true },
          equipmentModel: { category: true },
          category: true,
          approvalSteps: { approver: true },
        },
        approver: true,
      },
    });

    if (!step) {
      throw new NotFoundException(
        `Approval step with id "${stepId}" not found`,
      );
    }

    if (
      step.approver.id !== user.id &&
      !this.accessControl.isProcurementManagerOrAbove(user)
    ) {
      throw new ForbiddenException('You cannot view this approval step');
    }

    return step;
  }

  approve(
    stepId: string,
    user: AuthenticatedUser,
    actionDto: ApprovalActionDto,
  ): Promise<ApprovalStep> {
    return this.processAction(
      stepId,
      user,
      actionDto,
      ApprovalStepStatus.APPROVED,
    );
  }

  reject(
    stepId: string,
    user: AuthenticatedUser,
    actionDto: ApprovalActionDto,
  ): Promise<ApprovalStep> {
    if (!actionDto.comment?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }
    return this.processAction(
      stepId,
      user,
      actionDto,
      ApprovalStepStatus.REJECTED,
    );
  }

  private async processAction(
    stepId: string,
    user: AuthenticatedUser,
    actionDto: ApprovalActionDto,
    targetStatus: ApprovalStepStatus.APPROVED | ApprovalStepStatus.REJECTED,
  ): Promise<ApprovalStep> {
    const step = await this.findOne(stepId, user);
    this.assertCanActOnStep(step, user);

    const savedStep = await this.dataSource.transaction(async (manager) => {
      const stepRepo = manager.getRepository(ApprovalStep);
      const requestRepo = manager.getRepository(EquipmentRequest);

      const freshStep = await stepRepo.findOneOrFail({
        where: { id: stepId },
        relations: {
          request: {
            requester: { department: { directManager: true } },
            equipmentModel: true,
            category: true,
          },
          approver: true,
        },
      });

      if (freshStep.status !== ApprovalStepStatus.PENDING) {
        throw new BadRequestException(
          'This approval step has already been processed',
        );
      }

      freshStep.status = targetStatus;
      freshStep.comment = actionDto.comment;
      freshStep.actedAt = new Date();
      await stepRepo.save(freshStep);

      if (targetStatus === ApprovalStepStatus.REJECTED) {
        await this.handleRejection(stepRepo, requestRepo, freshStep);
      } else if (freshStep.approverRole === ApprovalRole.DIRECT_MANAGER) {
        await this.handleManagerApproval(stepRepo, requestRepo, freshStep);
      } else if (freshStep.approverRole === ApprovalRole.PROCUREMENT_MANAGER) {
        await this.handleProcurementApproval(manager, freshStep);
      }

      return stepRepo.findOneOrFail({
        where: { id: stepId },
        relations: {
          request: {
            requester: true,
            equipmentModel: true,
            category: true,
            approvalSteps: { approver: true },
          },
          approver: true,
        },
        order: { request: { approvalSteps: { level: 'ASC' } } },
      });
    });

    await this.dispatchNotifications(
      savedStep,
      targetStatus,
      actionDto.comment,
    );
    return savedStep;
  }

  private assertCanActOnStep(
    step: ApprovalStep,
    user: AuthenticatedUser,
  ): void {
    if (step.approver.id !== user.id) {
      throw new ForbiddenException(
        'You are not the designated approver for this step',
      );
    }
    if (step.status !== ApprovalStepStatus.PENDING) {
      throw new BadRequestException(
        'This approval step has already been processed',
      );
    }
  }

  private async handleRejection(
    stepRepo: Repository<ApprovalStep>,
    requestRepo: Repository<EquipmentRequest>,
    step: ApprovalStep,
  ): Promise<void> {
    const pendingSteps = await stepRepo.find({
      where: {
        request: { id: step.request.id },
        status: ApprovalStepStatus.PENDING,
      },
    });

    for (const pendingStep of pendingSteps) {
      pendingStep.status = ApprovalStepStatus.SKIPPED;
      await stepRepo.save(pendingStep);
    }

    await requestRepo.update(step.request.id, {
      status: RequestStatus.REJECTED,
      rejectedReason: step.comment,
    });
  }

  private async handleManagerApproval(
    stepRepo: Repository<ApprovalStep>,
    requestRepo: Repository<EquipmentRequest>,
    step: ApprovalStep,
  ): Promise<void> {
    await requestRepo.update(step.request.id, {
      status: RequestStatus.PENDING_PROCUREMENT_APPROVAL,
    });

    const procurementManager =
      await this.accessControl.findProcurementManager();
    if (!procurementManager) {
      throw new BadRequestException(
        'No procurement manager is configured to review this request',
      );
    }

    const procurementStep = stepRepo.create({
      request: step.request,
      level: step.level + 1,
      approver: procurementManager,
      approverRole: ApprovalRole.PROCUREMENT_MANAGER,
      status: ApprovalStepStatus.PENDING,
    });

    await stepRepo.save(procurementStep);
  }

  private async handleProcurementApproval(
    manager: DataSource['manager'],
    step: ApprovalStep,
  ): Promise<void> {
    const requestRepo = manager.getRepository(EquipmentRequest);
    const request = step.request;

    if (request.requestType === RequestType.LOAN) {
      await this.fulfillLoanRequest(manager, request, step);
      return;
    }

    await requestRepo.update(request.id, {
      status: RequestStatus.PROCUREMENT_APPROVED,
    });
  }

  private async fulfillLoanRequest(
    manager: DataSource['manager'],
    request: EquipmentRequest,
    step: ApprovalStep,
  ): Promise<void> {
    if (!request.equipmentModel) {
      throw new BadRequestException(
        'Loan request is missing an equipment model',
      );
    }

    const assetRepo = manager.getRepository(EquipmentAsset);
    const assignmentRepo = manager.getRepository(EquipmentAssignment);
    const requestRepo = manager.getRepository(EquipmentRequest);

    const availableAsset = await assetRepo.findOne({
      where: {
        equipmentModel: { id: request.equipmentModel.id },
        status: EquipmentAssetStatus.AVAILABLE,
      },
      relations: { equipmentModel: true },
      order: { createdAt: 'ASC' },
    });

    if (!availableAsset) {
      throw new BadRequestException(
        'No available equipment assets for the requested model',
      );
    }

    const now = new Date();
    availableAsset.status = EquipmentAssetStatus.IN_USE;
    availableAsset.assignedEmployee = request.requester;
    availableAsset.assignedAt = now;
    availableAsset.expectedReturnDate = request.endDate;
    await assetRepo.save(availableAsset);

    const assignment = assignmentRepo.create({
      equipmentAsset: availableAsset,
      employee: request.requester,
      request,
      assignedBy: step.approver,
      assignedAt: now,
      expectedReturnDate: request.endDate,
      status: EquipmentAssignmentStatus.ACTIVE,
    });
    const savedAssignment = await assignmentRepo.save(assignment);

    await requestRepo.update(request.id, { status: RequestStatus.FULFILLED });

    await this.notificationService.notifyEquipmentAssigned(
      request.requester,
      request,
      savedAssignment,
    );
  }

  private async dispatchNotifications(
    step: ApprovalStep,
    targetStatus: ApprovalStepStatus.APPROVED | ApprovalStepStatus.REJECTED,
    comment?: string,
  ): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: step.request.id },
      relations: {
        requester: true,
        equipmentModel: true,
        category: true,
        approvalSteps: { approver: true },
      },
      order: { approvalSteps: { level: 'ASC' } },
    });

    if (!request) return;

    if (targetStatus === ApprovalStepStatus.REJECTED) {
      await this.notificationService.notifyRequestRejected(
        request.requester,
        request,
        comment,
      );
      return;
    }

    if (step.approverRole === ApprovalRole.DIRECT_MANAGER) {
      const nextStep = request.approvalSteps?.find(
        (approvalStep) =>
          approvalStep.approverRole === ApprovalRole.PROCUREMENT_MANAGER &&
          approvalStep.status === ApprovalStepStatus.PENDING,
      );
      if (nextStep?.approver) {
        await this.notificationService.notifyApprovalRequired(
          nextStep.approver,
          request,
          nextStep,
        );
      }
      await this.notificationService.notifyRequestUpdate(
        request.requester,
        request,
        'Your request was approved by your manager and is awaiting procurement review.',
      );
      return;
    }

    if (request.requestType === RequestType.PROCUREMENT) {
      await this.notificationService.notifyProcurementApproved(
        request.requester,
        request,
      );
      return;
    }

    if (request.status === RequestStatus.FULFILLED) {
      await this.notificationService.notifyRequestApproved(
        request.requester,
        request,
      );
    }
  }
}
