import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(EquipmentRequest)
    private readonly requestRepository: Repository<EquipmentRequest>,
    @InjectRepository(EquipmentAsset)
    private readonly assetRepository: Repository<EquipmentAsset>,
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
}
