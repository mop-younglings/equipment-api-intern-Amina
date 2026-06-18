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
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentCategory } from '../../equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { RequestStatus } from '../enums/request-status.enum';
import { RequestType } from '../enums/request-type.enum';

@Entity('equipment_requests')
export class EquipmentRequest {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester!: Employee;

  @ApiProperty({ enum: RequestType })
  @Column({ name: 'request_type', type: 'enum', enum: RequestType })
  requestType!: RequestType;

  @ApiPropertyOptional({ type: () => EquipmentModel })
  @ManyToOne(() => EquipmentModel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'equipment_model_id' })
  equipmentModel?: EquipmentModel;

  @ApiPropertyOptional({ example: 'Custom standing desk' })
  @Column({ name: 'requested_item_name', nullable: true })
  requestedItemName?: string;

  @ApiPropertyOptional({ type: () => EquipmentCategory })
  @ManyToOne(() => EquipmentCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: EquipmentCategory;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @ApiProperty({ example: '2026-07-01' })
  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @ApiProperty()
  @Column({ type: 'text' })
  purpose!: string;

  @ApiProperty({ enum: RequestStatus })
  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING_MANAGER_APPROVAL,
  })
  status!: RequestStatus;

  @ApiPropertyOptional()
  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @ApiPropertyOptional()
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @ApiPropertyOptional()
  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason?: string;

  @ApiPropertyOptional({ type: () => ApprovalStep, isArray: true })
  @OneToMany(() => ApprovalStep, (step) => step.request)
  approvalSteps?: ApprovalStep[];

  @ApiPropertyOptional({ type: () => EquipmentAssignment, isArray: true })
  @OneToMany(() => EquipmentAssignment, (assignment) => assignment.request)
  assignments?: EquipmentAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
