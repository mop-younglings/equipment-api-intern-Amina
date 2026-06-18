import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(EquipmentModel)
    private readonly modelRepository: Repository<EquipmentModel>,
    @InjectRepository(EquipmentAsset)
    private readonly assetRepository: Repository<EquipmentAsset>,
    @InjectRepository(EquipmentCategory)
    private readonly categoryRepository: Repository<EquipmentCategory>,
  ) {}

  async getCatalog() {
    const models = await this.modelRepository.find({
      relations: { category: true },
      order: { name: 'ASC' },
    });

    const availableAssets = await this.assetRepository.find({
      where: { status: EquipmentAssetStatus.AVAILABLE },
      relations: { equipmentModel: { category: true } },
    });

    const availableModelIds = new Set(
      availableAssets.map((asset) => asset.equipmentModel.id),
    );

    return models.map((model) => ({
      ...model,
      availableCount: availableAssets.filter(
        (asset) => asset.equipmentModel.id === model.id,
      ).length,
      isAvailable: availableModelIds.has(model.id),
    }));
  }

  async findSimilar(query: string, categoryId?: string) {
    const models = await this.modelRepository.find({
      where: categoryId
        ? { category: { id: categoryId }, name: ILike(`%${query}%`) }
        : { name: ILike(`%${query}%`) },
      relations: { category: true },
      take: 10,
    });

    const availableAssets = await this.assetRepository.find({
      where: { status: EquipmentAssetStatus.AVAILABLE },
      relations: { equipmentModel: true },
    });

    return models.map((model) => ({
      ...model,
      availableCount: availableAssets.filter(
        (asset) => asset.equipmentModel.id === model.id,
      ).length,
      isAvailable:
        availableAssets.filter((asset) => asset.equipmentModel.id === model.id)
          .length > 0,
    }));
  }

  async findModelById(id: string) {
    const model = await this.modelRepository.findOne({
      where: { id },
      relations: { category: true, assets: true },
    });
    if (!model) {
      throw new NotFoundException(`Equipment model with id "${id}" not found`);
    }

    const availableCount = (model.assets ?? []).filter(
      (asset) => asset.status === EquipmentAssetStatus.AVAILABLE,
    ).length;

    return { ...model, availableCount };
  }

  async findSimilarModels(id: string) {
    const model = await this.modelRepository.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!model) {
      throw new NotFoundException(`Equipment model with id "${id}" not found`);
    }

    return this.findSimilar(model.name, model.category.id);
  }
}
