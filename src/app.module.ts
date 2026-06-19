import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { CommonModule } from './common/common.module';
import { AdminModule } from './modules/admin/admin.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { AuthModule } from './modules/auth/auth.module';
import { DepartmentModule } from './modules/department/department.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { EquipmentAssetModule } from './modules/equipment-asset/equipment-asset.module';
import { EquipmentAssignmentModule } from './modules/equipment-assignment/equipment-assignment.module';
import { EquipmentCategoryModule } from './modules/equipment-category/equipment-category.module';
import { EquipmentModelModule } from './modules/equipment-model/equipment-model.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { RequestModule } from './modules/request/request.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: process.env.NODE_ENV === 'test' ? 10_000 : 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    CommonModule,
    AuthModule,
    EmployeeModule,
    DepartmentModule,
    EquipmentCategoryModule,
    EquipmentModelModule,
    EquipmentAssetModule,
    EquipmentAssignmentModule,
    RequestModule,
    ApprovalModule,
    ProcurementModule,
    NotificationModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
