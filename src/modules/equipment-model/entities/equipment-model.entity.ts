import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';

@Entity('equipment_models')
export class EquipmentModel {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Dell Latitude 5420' })
  @Column()
  name!: string;

  @ApiProperty({ type: () => EquipmentCategory })
  @ManyToOne(() => EquipmentCategory, (category) => category.models, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: EquipmentCategory;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ example: 1200 })
  @Column({
    name: 'default_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  defaultValue!: number;

  @ApiPropertyOptional({ example: 2024 })
  @Column({ name: 'procurement_year', type: 'int', nullable: true })
  procurementYear?: number;

  @ApiPropertyOptional({ example: 2023 })
  @Column({ name: 'release_year', type: 'int', nullable: true })
  releaseYear?: number;

  @ApiPropertyOptional({ example: 36 })
  @Column({ name: 'expected_lifespan_months', type: 'int', nullable: true })
  expectedLifespanMonths?: number;

  @ApiProperty({ example: 2 })
  @Column({ name: 'low_stock_threshold', type: 'int', default: 1 })
  lowStockThreshold!: number;

  @ApiPropertyOptional({ type: () => EquipmentAsset, isArray: true })
  @OneToMany(() => EquipmentAsset, (asset) => asset.equipmentModel)
  assets?: EquipmentAsset[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
