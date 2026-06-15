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
import { Equipment } from '../../equipment/entities/equipment.entity';
import { RequestStatus } from '../enums/request-status.enum';

@Entity('equipment_requests')
export class EquipmentRequest {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester!: Employee;

  @ApiProperty({ type: () => Equipment })
  @ManyToOne(() => Equipment, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: Equipment;

  @ApiProperty({ example: 'Need a laptop for new hire onboarding' })
  @Column({ type: 'text' })
  reason!: string;

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.PENDING })
  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status!: RequestStatus;

  @ApiProperty({
    example: 1200,
    description:
      'Equipment value at time of request (used for approval routing)',
  })
  @Column({
    name: 'equipment_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  equipmentValue!: number;

  @ApiProperty({
    example: 2,
    description:
      'Total approval levels required (1 for standard, 2 for high-value)',
  })
  @Column({ name: 'required_approval_levels', type: 'int' })
  requiredApprovalLevels!: number;

  @ApiPropertyOptional({ type: () => ApprovalStep, isArray: true })
  @OneToMany(() => ApprovalStep, (step) => step.request)
  approvalSteps?: ApprovalStep[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export { RequestStatus } from '../enums/request-status.enum';
