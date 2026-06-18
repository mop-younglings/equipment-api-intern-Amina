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
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';
import { RequestAlternativeStatus } from '../enums/request-alternative-status.enum';
import { EquipmentRequest } from './equipment-request.entity';

@Entity('request_alternatives')
export class RequestAlternative {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => EquipmentRequest })
  @ManyToOne(() => EquipmentRequest, (request) => request.alternatives, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: EquipmentRequest;

  @ApiProperty({ type: () => EquipmentModel })
  @ManyToOne(() => EquipmentModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_model_id' })
  equipmentModel!: EquipmentModel;

  @ApiProperty({ type: () => Employee })
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suggested_by_id' })
  suggestedBy!: Employee;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  message?: string;

  @ApiProperty({ enum: RequestAlternativeStatus })
  @Column({
    type: 'enum',
    enum: RequestAlternativeStatus,
    default: RequestAlternativeStatus.SUGGESTED,
  })
  status!: RequestAlternativeStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
