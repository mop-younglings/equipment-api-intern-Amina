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
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { ApprovalRole } from '../../approval/enums/approval-role.enum';
import { ApprovalStepStatus } from '../../approval/enums/approval-step-status.enum';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { CancelRequestDto } from '../dto/cancel-request.dto';
import { CreateRequestDto } from '../dto/create-request.dto';
import { EquipmentRequest } from '../entities/equipment-request.entity';
import {
  CANCELLABLE_REQUEST_STATUSES,
  RequestStatus,
} from '../enums/request-status.enum';
import { RequestType } from '../enums/request-type.enum';

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(EquipmentRequest)
    private readonly requestRepository: Repository<EquipmentRequest>,
    @InjectRepository(EquipmentModel)
    private readonly modelRepository: Repository<EquipmentModel>,
    @InjectRepository(EquipmentCategory)
    private readonly categoryRepository: Repository<EquipmentCategory>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly accessControl: AccessControlService,
  ) {}

  findMyRequests(userId: string): Promise<EquipmentRequest[]> {
    return this.requestRepository.find({
      where: { requester: { id: userId } },
      relations: {
        requester: true,
        equipmentModel: { category: true },
        category: true,
        approvalSteps: { approver: true },
        alternatives: { equipmentModel: true, suggestedBy: true },
      },
      order: { createdAt: 'DESC', approvalSteps: { level: 'ASC' } },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<EquipmentRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: {
        requester: { department: true },
        equipmentModel: { category: true },
        category: true,
        approvalSteps: { approver: true },
        alternatives: { equipmentModel: true, suggestedBy: true },
        assignments: { equipmentAsset: { equipmentModel: true } },
      },
      order: { approvalSteps: { level: 'ASC' } },
    });

    if (!request) {
      throw new NotFoundException(`Request with id "${id}" not found`);
    }

    await this.assertCanViewRequest(request, user);
    return request;
  }

  async getTimeline(id: string, user: AuthenticatedUser) {
    const request = await this.findOne(id, user);
    return {
      requestId: request.id,
      status: request.status,
      steps: (request.approvalSteps ?? []).map((step) => ({
        id: step.id,
        level: step.level,
        approverRole: step.approverRole,
        approverName: `${step.approver.firstName} ${step.approver.lastName}`,
        status: step.status,
        comment: step.comment,
        actedAt: step.actedAt,
      })),
      alternatives: request.alternatives ?? [],
      assignments: request.assignments ?? [],
    };
  }

  async create(
    createRequestDto: CreateRequestDto,
    user: AuthenticatedUser,
  ): Promise<EquipmentRequest> {
    const requester = await this.employeeRepository.findOne({
      where: { id: user.id },
      relations: { department: { directManager: true } },
    });

    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    if (!requester.department?.directManager) {
      throw new BadRequestException(
        'Cannot submit request: department has no direct manager assigned',
      );
    }

    let equipmentModel: EquipmentModel | undefined;
    let category: EquipmentCategory | undefined;

    if (createRequestDto.requestType === RequestType.LOAN) {
      if (!createRequestDto.equipmentModelId) {
        throw new BadRequestException(
          'equipmentModelId is required for loan requests',
        );
      }
      equipmentModel =
        (await this.modelRepository.findOne({
          where: { id: createRequestDto.equipmentModelId },
          relations: { category: true },
        })) ?? undefined;
      if (!equipmentModel) {
        throw new NotFoundException('Equipment model not found');
      }
      category = equipmentModel.category;
    } else {
      if (!createRequestDto.requestedItemName || !createRequestDto.categoryId) {
        throw new BadRequestException(
          'requestedItemName and categoryId are required for procurement requests',
        );
      }
      category =
        (await this.categoryRepository.findOne({
          where: { id: createRequestDto.categoryId },
        })) ?? undefined;
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const savedRequest = await this.dataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(EquipmentRequest);
      const stepRepo = manager.getRepository(ApprovalStep);

      const request = requestRepo.create({
        requester,
        requestType: createRequestDto.requestType,
        equipmentModel,
        requestedItemName: createRequestDto.requestedItemName,
        category,
        quantity: createRequestDto.quantity ?? 1,
        startDate: createRequestDto.startDate,
        endDate: createRequestDto.endDate,
        purpose: createRequestDto.purpose,
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
      });

      const persisted = await requestRepo.save(request);

      const managerStep = stepRepo.create({
        request: persisted,
        level: 1,
        approver: requester.department!.directManager!,
        approverRole: ApprovalRole.DIRECT_MANAGER,
        status: ApprovalStepStatus.PENDING,
      });
      await stepRepo.save(managerStep);

      return requestRepo.findOneOrFail({
        where: { id: persisted.id },
        relations: {
          requester: true,
          equipmentModel: { category: true },
          category: true,
          approvalSteps: { approver: true },
        },
        order: { approvalSteps: { level: 'ASC' } },
      });
    });

    const firstStep = savedRequest.approvalSteps?.[0];
    if (firstStep?.approver) {
      await this.notificationService.notifyApprovalRequired(
        firstStep.approver,
        savedRequest,
        firstStep,
      );
    }

    return savedRequest;
  }

  async cancel(
    id: string,
    user: AuthenticatedUser,
    cancelDto: CancelRequestDto,
  ): Promise<EquipmentRequest> {
    const request = await this.findOne(id, user);

    if (request.requester.id !== user.id) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (!CANCELLABLE_REQUEST_STATUSES.includes(request.status)) {
      throw new BadRequestException(
        'Request can only be cancelled while pending manager or procurement approval',
      );
    }

    request.status = RequestStatus.CANCELLED;
    request.cancellationReason = cancelDto.reason;
    request.cancelledAt = new Date();

    const saved = await this.requestRepository.save(request);
    await this.notificationService.notifyRequestCancelled(
      request.requester,
      saved,
    );
    return saved;
  }

  private async assertCanViewRequest(
    request: EquipmentRequest,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (request.requester.id === user.id) {
      return;
    }

    if (this.accessControl.isAdmin(user)) {
      return;
    }

    if (this.accessControl.isProcurementManagerOrAbove(user)) {
      return;
    }

    if (this.accessControl.isDirectManagerOrAbove(user)) {
      const canView = await this.accessControl.isEmployeeInManagedDepartments(
        user.id,
        request.requester.id,
      );
      if (canView) return;
    }

    throw new ForbiddenException('You cannot view this request');
  }

  async findManagerPending(
    user: AuthenticatedUser,
  ): Promise<EquipmentRequest[]> {
    const departmentIds = await this.accessControl.getManagedDepartmentIds(
      user.id,
    );
    if (!departmentIds.length) {
      return [];
    }

    const employeeIds =
      await this.accessControl.getDepartmentEmployeeIds(departmentIds);

    return this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.equipmentModel', 'equipmentModel')
      .leftJoinAndSelect('request.category', 'category')
      .leftJoinAndSelect('request.approvalSteps', 'approvalSteps')
      .leftJoinAndSelect('approvalSteps.approver', 'approver')
      .where('request.status = :status', {
        status: RequestStatus.PENDING_MANAGER_APPROVAL,
      })
      .andWhere('requester.id IN (:...employeeIds)', { employeeIds })
      .orderBy('request.createdAt', 'DESC')
      .getMany();
  }

  async findManagerRequests(
    user: AuthenticatedUser,
  ): Promise<EquipmentRequest[]> {
    const departmentIds = await this.accessControl.getManagedDepartmentIds(
      user.id,
    );
    if (!departmentIds.length) {
      return [];
    }

    const employeeIds =
      await this.accessControl.getDepartmentEmployeeIds(departmentIds);

    return this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.equipmentModel', 'equipmentModel')
      .leftJoinAndSelect('request.category', 'category')
      .leftJoinAndSelect('request.approvalSteps', 'approvalSteps')
      .leftJoinAndSelect('approvalSteps.approver', 'approver')
      .where('requester.id IN (:...employeeIds)', { employeeIds })
      .orderBy('request.createdAt', 'DESC')
      .getMany();
  }

  async findProcurementPending(): Promise<EquipmentRequest[]> {
    return this.requestRepository.find({
      where: { status: RequestStatus.PENDING_PROCUREMENT_APPROVAL },
      relations: {
        requester: { department: true },
        equipmentModel: { category: true },
        category: true,
        approvalSteps: { approver: true },
      },
      order: { createdAt: 'ASC', approvalSteps: { level: 'ASC' } },
    });
  }
}
