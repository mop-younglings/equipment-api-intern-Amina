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
import { EquipmentStatus } from '../enums/equipment-status.enum';

@Entity('equipment')
export class Equipment {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'MacBook Pro 14"' })
  @Column()
  name!: string;

  @ApiProperty({ example: 'Computer' })
  @Column()
  category!: string;

  @ApiPropertyOptional({ example: 'M3, 16GB RAM' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: EquipmentStatus, example: EquipmentStatus.AVAILABLE })
  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.AVAILABLE,
  })
  status!: EquipmentStatus;

  @ApiProperty({
    example: 2499.99,
    description:
      'Monetary value used to determine multi-level approval routing',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value!: number;

  @ApiPropertyOptional({ type: () => Employee })
  @ManyToOne(() => Employee, (employee) => employee.assignedEquipment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_employee_id' })
  assignedEmployee?: Employee;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export { EquipmentStatus } from '../enums/equipment-status.enum';
