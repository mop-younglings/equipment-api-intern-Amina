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
import { Department } from '../../department/entities/department.entity';
import { EquipmentAsset } from '../../equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssignment } from '../../equipment-assignment/entities/equipment-assignment.entity';
import { Notification } from '../../notification/entities/notification.entity';
import { AccountStatus } from '../enums/account-status.enum';
import { EmployeeRole } from '../enums/employee-role.enum';

@Entity('employees')
export class Employee {
  @ApiProperty()
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

  @ApiHideProperty()
  @Column({ select: false })
  password!: string;

  @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.EMPLOYEE })
  @Column({ type: 'enum', enum: EmployeeRole, default: EmployeeRole.EMPLOYEE })
  role!: EmployeeRole;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  @Column({
    name: 'account_status',
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  accountStatus!: AccountStatus;

  @ApiPropertyOptional({ type: () => Department })
  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @ApiPropertyOptional({ type: () => EquipmentAsset, isArray: true })
  @OneToMany(() => EquipmentAsset, (asset) => asset.assignedEmployee)
  assignedAssets?: EquipmentAsset[];

  @ApiPropertyOptional({ type: () => EquipmentAssignment, isArray: true })
  @OneToMany(() => EquipmentAssignment, (assignment) => assignment.employee)
  assignments?: EquipmentAssignment[];

  @ApiPropertyOptional({ type: () => Notification, isArray: true })
  @OneToMany(() => Notification, (notification) => notification.recipient)
  notifications?: Notification[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
