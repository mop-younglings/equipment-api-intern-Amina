import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EquipmentModel } from '../../equipment-model/entities/equipment-model.entity';

@Entity('equipment_categories')
export class EquipmentCategory {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Laptop' })
  @Column()
  name!: string;

  @ApiPropertyOptional({ example: 'Portable computers' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/laptop.png' })
  @Column({ name: 'category_image', nullable: true })
  categoryImage?: string;

  @ApiPropertyOptional({ type: () => EquipmentModel, isArray: true })
  @OneToMany(() => EquipmentModel, (model) => model.category)
  models?: EquipmentModel[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
