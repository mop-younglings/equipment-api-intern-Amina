import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RETIRE_GRACE_PERIOD_DAYS } from '../../../common/constants/workflow.constants';
import { AccessControlService } from '../../../common/services/access-control.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAsset } from '../entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../enums/equipment-asset-status.enum';
import {
  AssignEquipmentAssetDto,
  CreateEquipmentAssetDto,
  UpdateEquipmentAssetDto,
  UpdateEquipmentAssetStatusDto,
} from '../dto/equipment-asset.dto';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentAssignmentStatus } from '../../equipment-assignment/enums/equipment-assignment-status.enum';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestStatus } from '../../request/enums/request-status.enum';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class EquipmentAssetService {
  constructor(
    @InjectRepository(EquipmentAsset)
    private readonly assetRepository: Repository<EquipmentAsset>,
    @InjectRepository(EquipmentModel)
    private readonly modelRepository: Repository<EquipmentModel>,
    @InjectRepository(EquipmentAssignment)
    private readonly assignmentRepository: Repository<EquipmentAssignment>,
    @InjectRepository(EquipmentRequest)
    private readonly requestRepository: Repository<EquipmentRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
    private readonly accessControl: AccessControlService,
  ) {}

  findAll(): Promise<EquipmentAsset[]> {
    return this.assetRepository.find({
      relations: {
        equipmentModel: { category: true },
        assignedEmployee: true,
        retiredBy: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<EquipmentAsset> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: {
        equipmentModel: { category: true },
        assignedEmployee: true,
        retiredBy: true,
        assignments: { employee: true },
      },
    });
    if (!asset) {
      throw new NotFoundException(`Equipment asset with id "${id}" not found`);
    }
    return asset;
  }

  async create(dto: CreateEquipmentAssetDto): Promise<EquipmentAsset> {
    const model = await this.modelRepository.findOne({
      where: { id: dto.equipmentModelId },
    });
    if (!model) {
      throw new NotFoundException('Equipment model not found');
    }

    const asset = this.assetRepository.create({
      equipmentModel: model,
      assetTag: dto.assetTag,
      serialNumber: dto.serialNumber,
      status: dto.status ?? EquipmentAssetStatus.AVAILABLE,
      notes: dto.notes,
    });
    return this.assetRepository.save(asset);
  }

  async update(
    id: string,
    dto: UpdateEquipmentAssetDto,
  ): Promise<EquipmentAsset> {
    const asset = await this.findOne(id);
    Object.assign(asset, {
      assetTag: dto.assetTag ?? asset.assetTag,
      serialNumber: dto.serialNumber ?? asset.serialNumber,
      notes: dto.notes ?? asset.notes,
    });
    return this.assetRepository.save(asset);
  }

  async updateStatus(
    id: string,
    dto: UpdateEquipmentAssetStatusDto,
  ): Promise<EquipmentAsset> {
    const asset = await this.findOne(id);
    asset.status = dto.status;
    return this.assetRepository.save(asset);
  }

  async assign(
    id: string,
    dto: AssignEquipmentAssetDto,
    user: AuthenticatedUser,
  ) {
    const asset = await this.findOne(id);
    if (asset.status !== EquipmentAssetStatus.AVAILABLE) {
      throw new BadRequestException('Only available assets can be assigned');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const assignedBy = await this.employeeRepository.findOne({
      where: { id: user.id },
    });

    const now = new Date();
    asset.status = EquipmentAssetStatus.IN_USE;
    asset.assignedEmployee = employee;
    asset.assignedAt = now;
    asset.expectedReturnDate = dto.expectedReturnDate;
    await this.assetRepository.save(asset);

    let request: EquipmentRequest | undefined;
    if (dto.requestId) {
      request =
        (await this.requestRepository.findOne({
          where: { id: dto.requestId },
          relations: { requester: true, equipmentModel: true, category: true },
        })) ?? undefined;
    }

    const assignment = this.assignmentRepository.create({
      equipmentAsset: asset,
      employee,
      request,
      assignedBy: assignedBy ?? undefined,
      assignedAt: now,
      expectedReturnDate: dto.expectedReturnDate,
      status: EquipmentAssignmentStatus.ACTIVE,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    if (request && request.status === RequestStatus.PROCUREMENT_APPROVED) {
      await this.requestRepository.update(request.id, {
        status: RequestStatus.FULFILLED,
      });
      await this.notificationService.notifyEquipmentAssigned(
        request.requester,
        request,
        savedAssignment,
      );
    }

    return savedAssignment;
  }

  async retire(id: string, user: AuthenticatedUser): Promise<EquipmentAsset> {
    const asset = await this.findOne(id);
    if (asset.status === EquipmentAssetStatus.RETIRED) {
      return asset;
    }

    const retiredBy = await this.employeeRepository.findOne({
      where: { id: user.id },
    });

    asset.status = EquipmentAssetStatus.RETIRED;
    asset.retiredAt = new Date();
    asset.retiredBy = retiredBy ?? undefined;
    asset.assignedEmployee = undefined;
    asset.assignedAt = undefined;
    asset.expectedReturnDate = undefined;
    return this.assetRepository.save(asset);
  }

  async remove(id: string): Promise<void> {
    const asset = await this.findOne(id);

    if (asset.status === EquipmentAssetStatus.RETIRED) {
      const retiredAt = asset.retiredAt ? new Date(asset.retiredAt) : null;
      if (retiredAt) {
        const graceEnd = new Date(retiredAt);
        graceEnd.setDate(graceEnd.getDate() + RETIRE_GRACE_PERIOD_DAYS);
        if (new Date() < graceEnd) {
          throw new BadRequestException(
            `Retired assets can only be hard-deleted after ${RETIRE_GRACE_PERIOD_DAYS} days`,
          );
        }
      }
    } else if (await this.hasHistory(asset.id)) {
      throw new BadRequestException(
        'Assets with assignment, request, or procurement history must be retired instead of deleted',
      );
    } else if (
      asset.status !== EquipmentAssetStatus.AVAILABLE &&
      asset.status !== EquipmentAssetStatus.MAINTENANCE
    ) {
      throw new BadRequestException(
        'Only unused available or maintenance assets without history can be hard-deleted',
      );
    }

    await this.assetRepository.remove(asset);
  }

  async hasHistory(assetId: string): Promise<boolean> {
    const assignmentCount = await this.assignmentRepository.count({
      where: { equipmentAsset: { id: assetId } },
    });
    return assignmentCount > 0;
  }

  async getInventoryStats() {
    const assets = await this.assetRepository.find({
      relations: { equipmentModel: true },
    });

    const byStatus = assets.reduce<Record<string, number>>((acc, asset) => {
      acc[asset.status] = (acc[asset.status] ?? 0) + 1;
      return acc;
    }, {});

    const models = await this.modelRepository.find();
    const lowStock = models.filter((model) => {
      const availableCount = assets.filter(
        (asset) =>
          asset.equipmentModel.id === model.id &&
          asset.status === EquipmentAssetStatus.AVAILABLE,
      ).length;
      return availableCount <= model.lowStockThreshold;
    });

    return {
      totalAssets: assets.length,
      byStatus,
      lowStockModels: lowStock.map((model) => ({
        id: model.id,
        name: model.name,
        availableCount: assets.filter(
          (asset) =>
            asset.equipmentModel.id === model.id &&
            asset.status === EquipmentAssetStatus.AVAILABLE,
        ).length,
        lowStockThreshold: model.lowStockThreshold,
      })),
    };
  }

  assertProcurementAccess(user: AuthenticatedUser): void {
    if (!this.accessControl.isProcurementManagerOrAbove(user)) {
      throw new ForbiddenException('Procurement manager access required');
    }
  }
}
