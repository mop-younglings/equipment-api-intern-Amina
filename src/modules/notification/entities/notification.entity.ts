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
import { ApprovalStep } from '../../approval/entities/approval-step.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
export class Notification {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: Employee;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.APPROVAL_REQUIRED,
  })
  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ example: 'Approval required: iPhone 15 request' })
  @Column()
  title!: string;

  @ApiProperty({
    example: 'John Smith requested iPhone 15 and needs your approval.',
  })
  @Column({ type: 'text' })
  message!: string;

  @ApiProperty({ example: false })
  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @ApiPropertyOptional({ example: '2024-06-15T10:30:00.000Z' })
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @ApiPropertyOptional({ type: () => EquipmentRequest })
  @ManyToOne(() => EquipmentRequest, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'request_id' })
  request?: EquipmentRequest;

  @ApiPropertyOptional({ type: () => ApprovalStep })
  @ManyToOne(() => ApprovalStep, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approval_step_id' })
  approvalStep?: ApprovalStep;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export { NotificationType } from '../enums/notification-type.enum';
