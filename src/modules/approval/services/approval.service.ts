import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Equipment } from '../../equipment/entities/equipment.entity';
import { EquipmentStatus } from '../../equipment/enums/equipment-status.enum';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestStatus } from '../../request/enums/request-status.enum';
import { ApprovalActionDto } from '../dto/approval-action.dto';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalStep)
    private readonly approvalStepRepository: Repository<ApprovalStep>,
    @InjectRepository(EquipmentRequest)
    private readonly requestRepository: Repository<EquipmentRequest>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  async findPendingForUser(userId: string): Promise<ApprovalStep[]> {
    const pendingSteps = await this.approvalStepRepository.find({
      where: {
        approver: { id: userId },
        status: ApprovalStepStatus.PENDING,
      },
      relations: {
        request: { requester: true, equipment: true },
        approver: true,
      },
      order: { createdAt: 'ASC' },
    });

    const actionable: ApprovalStep[] = [];

    for (const step of pendingSteps) {
      if (step.level === 1) {
        actionable.push(step);
        continue;
      }

      const previousStep = await this.approvalStepRepository.findOne({
        where: {
          request: { id: step.request.id },
          level: step.level - 1,
        },
      });

      if (previousStep?.status === ApprovalStepStatus.APPROVED) {
        actionable.push(step);
      }
    }

    return actionable;
  }

  async approve(
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

  async reject(
    stepId: string,
    user: AuthenticatedUser,
    actionDto: ApprovalActionDto,
  ): Promise<ApprovalStep> {
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
    const step = await this.approvalStepRepository.findOne({
      where: { id: stepId },
      relations: {
        request: {
          requester: true,
          equipment: true,
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

    this.assertCanActOnStep(step, user);

    const savedStep = await this.dataSource.transaction(async (manager) => {
      const stepRepo = manager.getRepository(ApprovalStep);
      const requestRepo = manager.getRepository(EquipmentRequest);
      const equipmentRepo = manager.getRepository(Equipment);

      const freshStep = await stepRepo.findOneOrFail({
        where: { id: stepId },
        relations: {
          request: {
            requester: true,
            equipment: true,
            approvalSteps: true,
          },
        },
      });

      if (freshStep.status !== ApprovalStepStatus.PENDING) {
        throw new BadRequestException(
          'This approval step has already been processed',
        );
      }

      const allSteps = freshStep.request.approvalSteps ?? [];
      if (!this.isStepActionable(freshStep, allSteps)) {
        throw new BadRequestException(
          'Previous approval levels must be completed first',
        );
      }

      freshStep.status = targetStatus;
      freshStep.comment = actionDto.comment;
      freshStep.actedAt = new Date();
      await stepRepo.save(freshStep);

      if (targetStatus === ApprovalStepStatus.REJECTED) {
        await this.handleRejection(stepRepo, requestRepo, freshStep.request);
      } else {
        await this.handleApproval(
          stepRepo,
          requestRepo,
          equipmentRepo,
          freshStep.request,
        );
      }

      return stepRepo.findOneOrFail({
        where: { id: stepId },
        relations: {
          request: {
            requester: true,
            equipment: true,
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

  private async dispatchNotifications(
    step: ApprovalStep,
    targetStatus: ApprovalStepStatus.APPROVED | ApprovalStepStatus.REJECTED,
    comment?: string,
  ): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: step.request.id },
      relations: {
        requester: true,
        equipment: true,
        approvalSteps: { approver: true },
      },
      order: { approvalSteps: { level: 'ASC' } },
    });

    if (!request) {
      return;
    }

    if (targetStatus === ApprovalStepStatus.REJECTED) {
      await this.notificationService.notifyRequestRejected(
        request.requester,
        request,
        comment,
      );
      return;
    }

    if (request.status === RequestStatus.APPROVED) {
      await this.notificationService.notifyRequestApproved(
        request.requester,
        request,
      );
      return;
    }

    if (request.status === RequestStatus.PARTIALLY_APPROVED) {
      await this.notificationService.notifyRequestUpdate(
        request.requester,
        request,
        `Your request for ${request.equipment.name} was approved at level ${step.level} and is awaiting further approval.`,
      );

      const nextStep = request.approvalSteps?.find(
        (approvalStep) =>
          approvalStep.level === step.level + 1 &&
          approvalStep.status === ApprovalStepStatus.PENDING,
      );

      if (nextStep?.approver) {
        await this.notificationService.notifyApprovalRequired(
          nextStep.approver,
          request,
          nextStep,
        );
      }
    }
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

    const allSteps = step.request.approvalSteps ?? [];
    if (!this.isStepActionable(step, allSteps)) {
      throw new BadRequestException(
        'Previous approval levels must be completed first',
      );
    }
  }

  private isStepActionable(
    step: ApprovalStep,
    allSteps: ApprovalStep[],
  ): boolean {
    if (step.status !== ApprovalStepStatus.PENDING) {
      return false;
    }

    if (step.level === 1) {
      return true;
    }

    const previousLevel = allSteps.find((s) => s.level === step.level - 1);
    return previousLevel?.status === ApprovalStepStatus.APPROVED;
  }

  private async handleRejection(
    stepRepo: Repository<ApprovalStep>,
    requestRepo: Repository<EquipmentRequest>,
    request: EquipmentRequest,
  ): Promise<void> {
    const pendingSteps = (request.approvalSteps ?? []).filter(
      (s) => s.status === ApprovalStepStatus.PENDING,
    );

    for (const pendingStep of pendingSteps) {
      pendingStep.status = ApprovalStepStatus.SKIPPED;
      await stepRepo.save(pendingStep);
    }

    request.status = RequestStatus.REJECTED;
    await requestRepo.update(request.id, { status: RequestStatus.REJECTED });
  }

  private async handleApproval(
    stepRepo: Repository<ApprovalStep>,
    requestRepo: Repository<EquipmentRequest>,
    equipmentRepo: Repository<Equipment>,
    request: EquipmentRequest,
  ): Promise<void> {
    const updatedSteps = await stepRepo.find({
      where: { request: { id: request.id } },
    });

    const stillPending = updatedSteps.some(
      (s) => s.status === ApprovalStepStatus.PENDING,
    );

    if (stillPending) {
      await requestRepo.update(request.id, {
        status: RequestStatus.PARTIALLY_APPROVED,
      });
      return;
    }

    await requestRepo.update(request.id, { status: RequestStatus.APPROVED });

    const equipment = await equipmentRepo.findOne({
      where: { id: request.equipment.id },
      relations: { assignedEmployee: true },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment for approved request not found');
    }

    if (equipment.status !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException(
        'Equipment is no longer available; request cannot be fulfilled',
      );
    }

    equipment.status = EquipmentStatus.IN_USE;
    equipment.assignedEmployee = request.requester;
    await equipmentRepo.save(equipment);
  }
}
