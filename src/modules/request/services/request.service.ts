import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HIGH_VALUE_THRESHOLD } from '../../../common/constants/approval.constants';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { ApprovalStepStatus } from '../../approval/enums/approval-step-status.enum';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { Employee } from '../../employee/entities/employee.entity';
import { Equipment } from '../../equipment/entities/equipment.entity';
import { EquipmentStatus } from '../../equipment/enums/equipment-status.enum';
import { NotificationService } from '../../notification/services/notification.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import { EquipmentRequest } from '../entities/equipment-request.entity';
import { RequestStatus } from '../enums/request-status.enum';

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(EquipmentRequest)
    private readonly requestRepository: Repository<EquipmentRequest>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  findAll(user: AuthenticatedUser): Promise<EquipmentRequest[]> {
    const query = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.equipment', 'equipment')
      .leftJoinAndSelect('request.approvalSteps', 'approvalSteps')
      .leftJoinAndSelect('approvalSteps.approver', 'approver')
      .orderBy('request.createdAt', 'DESC')
      .addOrderBy('approvalSteps.level', 'ASC');

    if (user.role !== EmployeeRole.ADMIN) {
      query.andWhere('requester.id = :userId', { userId: user.id });
    }

    return query.getMany();
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<EquipmentRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: {
        requester: true,
        equipment: { assignedEmployee: true },
        approvalSteps: { approver: true },
      },
      order: { approvalSteps: { level: 'ASC' } },
    });

    if (!request) {
      throw new NotFoundException(`Request with id "${id}" not found`);
    }

    if (user.role !== EmployeeRole.ADMIN && request.requester.id !== user.id) {
      throw new ForbiddenException('You can only view your own requests');
    }

    return request;
  }

  async create(
    createRequestDto: CreateRequestDto,
    user: AuthenticatedUser,
  ): Promise<EquipmentRequest> {
    const equipment = await this.equipmentRepository.findOne({
      where: { id: createRequestDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Equipment with id "${createRequestDto.equipmentId}" not found`,
      );
    }

    if (equipment.status !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException('Equipment is not available for request');
    }

    const requester = await this.employeeRepository.findOne({
      where: { id: user.id },
      relations: { manager: true },
    });

    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    if (!requester.manager) {
      throw new BadRequestException(
        'Cannot submit request: no manager assigned to requester',
      );
    }

    const equipmentValue = Number(equipment.value);
    const isHighValue = equipmentValue >= HIGH_VALUE_THRESHOLD;
    const requiredApprovalLevels = isHighValue ? 2 : 1;

    const savedRequest = await this.dataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(EquipmentRequest);
      const stepRepo = manager.getRepository(ApprovalStep);

      const request = requestRepo.create({
        requester,
        equipment,
        reason: createRequestDto.reason,
        status: RequestStatus.PENDING,
        equipmentValue,
        requiredApprovalLevels,
      });

      const persistedRequest = await requestRepo.save(request);

      const managerStep = stepRepo.create({
        request: persistedRequest,
        level: 1,
        approver: requester.manager!,
        status: ApprovalStepStatus.PENDING,
      });

      const steps: ApprovalStep[] = [managerStep];

      if (isHighValue) {
        const admin = await manager.getRepository(Employee).findOne({
          where: { role: EmployeeRole.ADMIN },
          order: { createdAt: 'ASC' },
        });

        if (!admin) {
          throw new BadRequestException(
            'High-value requests require an admin approver, but none exists',
          );
        }

        steps.push(
          stepRepo.create({
            request: persistedRequest,
            level: 2,
            approver: admin,
            status: ApprovalStepStatus.PENDING,
          }),
        );
      }

      await stepRepo.save(steps);

      return requestRepo.findOneOrFail({
        where: { id: persistedRequest.id },
        relations: {
          requester: true,
          equipment: true,
          approvalSteps: { approver: true },
        },
        order: { approvalSteps: { level: 'ASC' } },
      });
    });

    const firstStep = savedRequest.approvalSteps?.find(
      (step) => step.level === 1,
    );
    if (firstStep?.approver) {
      await this.notificationService.notifyApprovalRequired(
        firstStep.approver,
        savedRequest,
        firstStep,
      );
    }

    return savedRequest;
  }
}
