import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { EquipmentAssignmentStatus } from '../enums/equipment-assignment-status.enum';

@Entity('equipment_assignments')
export class EquipmentAssignment {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => EquipmentAsset })
  @ManyToOne(() => EquipmentAsset, (asset) => asset.assignments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'equipment_asset_id' })
  equipmentAsset!: EquipmentAsset;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, (employee) => employee.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ApiPropertyOptional({ type: () => EquipmentRequest })
  @ManyToOne(() => EquipmentRequest, (request) => request.assignments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'request_id' })
  request?: EquipmentRequest;

  @ApiPropertyOptional({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy?: Employee;

  @ApiProperty()
  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt!: Date;

  @ApiPropertyOptional()
  @Column({ name: 'expected_return_date', type: 'date', nullable: true })
  expectedReturnDate?: string;

  @ApiPropertyOptional({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'return_requested_by_id' })
  returnRequestedBy?: Employee;

  @ApiPropertyOptional()
  @Column({ name: 'return_requested_at', type: 'timestamp', nullable: true })
  returnRequestedAt?: Date;

  @ApiPropertyOptional()
  @Column({ name: 'return_by_date', type: 'date', nullable: true })
  returnByDate?: string;

  @ApiPropertyOptional()
  @Column({ name: 'returned_at', type: 'timestamp', nullable: true })
  returnedAt?: Date;

  @ApiPropertyOptional()
  @Column({ name: 'return_note', type: 'text', nullable: true })
  returnNote?: string;

  @ApiProperty({ enum: EquipmentAssignmentStatus })
  @Column({
    type: 'enum',
    enum: EquipmentAssignmentStatus,
    default: EquipmentAssignmentStatus.ACTIVE,
  })
  status!: EquipmentAssignmentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
