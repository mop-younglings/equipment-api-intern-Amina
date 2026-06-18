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
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { EquipmentAssetStatus } from '../enums/equipment-asset-status.enum';

@Entity('equipment_assets')
export class EquipmentAsset {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => EquipmentModel })
  @ManyToOne(() => EquipmentModel, (model) => model.assets, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'equipment_model_id' })
  equipmentModel!: EquipmentModel;

  @ApiProperty({ example: 'LT-001' })
  @Column({ name: 'asset_tag', unique: true })
  assetTag!: string;

  @ApiPropertyOptional({ example: 'SN123456' })
  @Column({ name: 'serial_number', nullable: true })
  serialNumber?: string;

  @ApiProperty({ enum: EquipmentAssetStatus })
  @Column({
    type: 'enum',
    enum: EquipmentAssetStatus,
    default: EquipmentAssetStatus.AVAILABLE,
  })
  status!: EquipmentAssetStatus;

  @ApiPropertyOptional({ type: () => Employee })
  @ManyToOne(() => Employee, (employee) => employee.assignedAssets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_employee_id' })
  assignedEmployee?: Employee;

  @ApiPropertyOptional()
  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt?: Date;

  @ApiPropertyOptional()
  @Column({ name: 'expected_return_date', type: 'date', nullable: true })
  expectedReturnDate?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiPropertyOptional()
  @Column({ name: 'retired_at', type: 'timestamp', nullable: true })
  retiredAt?: Date;

  @ApiPropertyOptional({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'retired_by_id' })
  retiredBy?: Employee;

  @ApiPropertyOptional({ type: () => EquipmentAssignment, isArray: true })
  @OneToMany(
    () => EquipmentAssignment,
    (assignment) => assignment.equipmentAsset,
  )
  assignments?: EquipmentAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
