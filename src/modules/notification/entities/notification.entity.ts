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
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentRequest } from '../../request/entities/equipment-request.entity';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, (employee) => employee.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: Employee;

  @ApiProperty({ enum: NotificationType })
  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  @Column()
  title!: string;

  @ApiProperty()
  @Column({ type: 'text' })
  message!: string;

  @ApiProperty({ default: false })
  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ type: () => EquipmentAssignment })
  @ManyToOne(() => EquipmentAssignment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'equipment_assignment_id' })
  equipmentAssignment?: EquipmentAssignment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
