import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { RequestAlternative } from '../../request/entities/request-alternative.entity';
import { RequestAlternativeStatus } from '../../request/enums/request-alternative-status.enum';
import { SuggestAlternativeDto } from '../dto/procurement.dto';
import { Employee } from '../../employee/entities/employee.entity';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(EquipmentRequest)
    private readonly requestRepository: Repository<EquipmentRequest>,
    @InjectRepository(RequestAlternative)
    private readonly alternativeRepository: Repository<RequestAlternative>,
    @InjectRepository(EquipmentModel)
    private readonly modelRepository: Repository<EquipmentModel>,
    @InjectRepository(EquipmentAsset)
    private readonly assetRepository: Repository<EquipmentAsset>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
  ) {}

  async checkAvailability(requestId: string) {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: { equipmentModel: true },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (!request.equipmentModel) {
      return {
        requestId,
        availableCount: 0,
        assets: [],
      };
    }

    const assets = await this.assetRepository.find({
      where: {
        equipmentModel: { id: request.equipmentModel.id },
        status: EquipmentAssetStatus.AVAILABLE,
      },
      relations: { equipmentModel: true },
    });

    return {
      requestId,
      equipmentModelId: request.equipmentModel.id,
      availableCount: assets.length,
      assets,
    };
  }

  async suggestAlternative(
    requestId: string,
    user: AuthenticatedUser,
    dto: SuggestAlternativeDto,
  ): Promise<RequestAlternative> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: { requester: true },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const model = await this.modelRepository.findOne({
      where: { id: dto.equipmentModelId },
    });
    if (!model) {
      throw new NotFoundException('Equipment model not found');
    }

    const suggester = await this.employeeRepository.findOne({
      where: { id: user.id },
    });

    const alternative = this.alternativeRepository.create({
      request,
      equipmentModel: model,
      suggestedBy: suggester!,
      message: dto.message,
      status: RequestAlternativeStatus.SUGGESTED,
    });

    const saved = await this.alternativeRepository.save(alternative);
    await this.notificationService.notifyAlternativeSuggested(
      request.requester,
      request,
      model.name,
      dto.message,
    );

    return saved;
  }
}
