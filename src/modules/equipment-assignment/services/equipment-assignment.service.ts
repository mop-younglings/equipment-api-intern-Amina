import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessControlService } from '../../../common/services/access-control.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { NotificationService } from '../../notification/services/notification.service';
import { ReturnRequestDto } from '../dto/return-request.dto';
import { EquipmentAssignment } from '../entities/equipment-assignment.entity';
import { EquipmentAssignmentStatus } from '../enums/equipment-assignment-status.enum';

@Injectable()
export class EquipmentAssignmentService {
  constructor(
    @InjectRepository(EquipmentAssignment)
    private readonly assignmentRepository: Repository<EquipmentAssignment>,
    @InjectRepository(EquipmentAsset)
    private readonly assetRepository: Repository<EquipmentAsset>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
    private readonly accessControl: AccessControlService,
  ) {}

  findMyAssignments(userId: string): Promise<EquipmentAssignment[]> {
    return this.assignmentRepository.find({
      where: { employee: { id: userId } },
      relations: {
        equipmentAsset: { equipmentModel: { category: true } },
        employee: true,
        assignedBy: true,
        returnRequestedBy: true,
      },
      order: { assignedAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<EquipmentAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: {
        equipmentAsset: { equipmentModel: { category: true } },
        employee: { department: true },
        assignedBy: true,
        returnRequestedBy: true,
        request: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with id "${id}" not found`);
    }

    await this.assertCanViewAssignment(assignment, user);
    return assignment;
  }

  async findTeamEquipment(
    user: AuthenticatedUser,
  ): Promise<EquipmentAssignment[]> {
    const departmentIds = await this.accessControl.getManagedDepartmentIds(
      user.id,
    );
    if (!departmentIds.length) {
      return [];
    }

    const employeeIds =
      await this.accessControl.getDepartmentEmployeeIds(departmentIds);

    return this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.equipmentAsset', 'asset')
      .leftJoinAndSelect('asset.equipmentModel', 'model')
      .leftJoinAndSelect('model.category', 'category')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .where('employee.id IN (:...employeeIds)', { employeeIds })
      .andWhere('assignment.status IN (:...statuses)', {
        statuses: [
          EquipmentAssignmentStatus.ACTIVE,
          EquipmentAssignmentStatus.RETURN_REQUESTED,
        ],
      })
      .orderBy('assignment.assignedAt', 'DESC')
      .getMany();
  }

  async requestReturn(
    id: string,
    user: AuthenticatedUser,
    dto: ReturnRequestDto,
  ): Promise<EquipmentAssignment> {
    const assignment = await this.findOne(id, user);

    if (!this.accessControl.isDirectManagerOrAbove(user)) {
      throw new ForbiddenException(
        'Only managers can request equipment returns',
      );
    }

    const canManage = await this.accessControl.isEmployeeInManagedDepartments(
      user.id,
      assignment.employee.id,
    );
    if (!canManage && !this.accessControl.isProcurementManagerOrAbove(user)) {
      throw new ForbiddenException(
        'You cannot request return for this assignment',
      );
    }

    if (assignment.status !== EquipmentAssignmentStatus.ACTIVE) {
      throw new BadRequestException(
        'Only active assignments can have return requested',
      );
    }

    const requester = await this.employeeRepository.findOne({
      where: { id: user.id },
    });

    assignment.status = EquipmentAssignmentStatus.RETURN_REQUESTED;
    assignment.returnRequestedBy = requester ?? undefined;
    assignment.returnRequestedAt = new Date();
    assignment.returnByDate = dto.returnByDate;
    assignment.returnNote = dto.message;

    const asset = assignment.equipmentAsset;
    asset.status = EquipmentAssetStatus.RETURN_REQUESTED;
    await this.assetRepository.save(asset);

    const saved = await this.assignmentRepository.save(assignment);
    await this.notificationService.notifyEquipmentReturnRequested(
      assignment.employee,
      saved,
      dto.returnByDate,
      dto.message,
    );

    return saved;
  }

  async completeReturn(
    id: string,
    user: AuthenticatedUser,
  ): Promise<EquipmentAssignment> {
    const assignment = await this.findOne(id, user);

    if (
      assignment.employee.id !== user.id &&
      !this.accessControl.isDirectManagerOrAbove(user)
    ) {
      throw new ForbiddenException('You cannot complete this return');
    }

    if (assignment.status !== EquipmentAssignmentStatus.RETURN_REQUESTED) {
      throw new BadRequestException('Assignment is not awaiting return');
    }

    assignment.status = EquipmentAssignmentStatus.RETURNED;
    assignment.returnedAt = new Date();

    const asset = assignment.equipmentAsset;
    asset.status = EquipmentAssetStatus.AVAILABLE;
    asset.assignedEmployee = undefined;
    asset.assignedAt = undefined;
    asset.expectedReturnDate = undefined;
    await this.assetRepository.save(asset);

    const saved = await this.assignmentRepository.save(assignment);
    await this.notificationService.notifyEquipmentReturned(
      assignment.employee,
      saved,
    );

    return saved;
  }

  private async assertCanViewAssignment(
    assignment: EquipmentAssignment,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (assignment.employee.id === user.id) return;
    if (this.accessControl.isProcurementManagerOrAbove(user)) return;

    if (this.accessControl.isDirectManagerOrAbove(user)) {
      const canView = await this.accessControl.isEmployeeInManagedDepartments(
        user.id,
        assignment.employee.id,
      );
      if (canView) return;
    }

    throw new ForbiddenException('You cannot view this assignment');
  }
}
