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
import { Employee } from '../../employee/entities/employee.entity';

@Entity('departments')
export class Department {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Engineering' })
  @Column()
  name!: string;

  @ApiPropertyOptional({ type: () => Employee })
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'direct_manager_id' })
  directManager?: Employee;

  @ApiPropertyOptional({ type: () => Employee, isArray: true })
  @OneToMany(() => Employee, (employee) => employee.department)
  employees?: Employee[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
