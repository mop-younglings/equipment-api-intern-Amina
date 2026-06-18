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
import { ApprovalRole } from '../enums/approval-role.enum';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';

@Entity('approval_steps')
export class ApprovalStep {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => EquipmentRequest })
  @ManyToOne(() => EquipmentRequest, (request) => request.approvalSteps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: EquipmentRequest;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int' })
  level!: number;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approver_id' })
  approver!: Employee;

  @ApiProperty({ enum: ApprovalRole })
  @Column({ name: 'approver_role', type: 'enum', enum: ApprovalRole })
  approverRole!: ApprovalRole;

  @ApiProperty({ enum: ApprovalStepStatus })
  @Column({
    type: 'enum',
    enum: ApprovalStepStatus,
    default: ApprovalStepStatus.PENDING,
  })
  status!: ApprovalStepStatus;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @ApiPropertyOptional()
  @Column({ name: 'acted_at', type: 'timestamp', nullable: true })
  actedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
