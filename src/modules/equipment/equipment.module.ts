import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EquipmentController } from './controllers/equipment.controller';
import { Equipment } from './entities/equipment.entity';
import { EquipmentService } from './services/equipment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Equipment]), AuthModule],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
