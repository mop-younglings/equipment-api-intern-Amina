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
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';

@Entity('approval_steps')
export class ApprovalStep {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => EquipmentRequest, (request) => request.approvalSteps, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: EquipmentRequest;

  @ApiProperty({
    example: 1,
    description: 'Approval level (1 = manager, 2 = admin for high-value items)',
  })
  @Column({ type: 'int' })
  level!: number;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approver_id' })
  approver!: Employee;

  @ApiProperty({
    enum: ApprovalStepStatus,
    example: ApprovalStepStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: ApprovalStepStatus,
    default: ApprovalStepStatus.PENDING,
  })
  status!: ApprovalStepStatus;

  @ApiPropertyOptional({ example: 'Approved for Q2 onboarding' })
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @ApiPropertyOptional({ example: '2024-06-15T10:30:00.000Z' })
  @Column({ name: 'acted_at', type: 'timestamp', nullable: true })
  actedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export { ApprovalStepStatus } from '../enums/approval-step-status.enum';
