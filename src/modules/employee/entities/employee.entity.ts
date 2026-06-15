import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
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
import { Equipment } from '../../equipment/entities/equipment.entity';
import { Notification } from '../../notification/entities/notification.entity';
import { EmployeeRole } from '../enums/employee-role.enum';

@Entity('employees')
export class Employee {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Jane' })
  @Column({ name: 'first_name' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @Column({ name: 'last_name' })
  lastName!: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @Column({ unique: true })
  email!: string;

  @ApiProperty({ example: 'Engineering' })
  @Column()
  department!: string;

  @ApiHideProperty()
  @Column({ select: false })
  password!: string;

  @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.USER })
  @Column({
    type: 'enum',
    enum: EmployeeRole,
    default: EmployeeRole.USER,
  })
  role!: EmployeeRole;

  @ApiPropertyOptional({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager?: Employee;

  @ApiPropertyOptional({ type: () => Equipment, isArray: true })
  @OneToMany(() => Equipment, (equipment) => equipment.assignedEmployee)
  assignedEquipment?: Equipment[];

  @ApiPropertyOptional({ type: () => Notification, isArray: true })
  @OneToMany(() => Notification, (notification) => notification.recipient)
  notifications?: Notification[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
