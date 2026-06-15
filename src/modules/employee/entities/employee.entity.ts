import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Equipment } from '../../equipment/entities/equipment.entity';
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

  @ApiPropertyOptional({ type: () => Equipment, isArray: true })
  @OneToMany(() => Equipment, (equipment) => equipment.assignedEmployee)
  assignedEquipment?: Equipment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
