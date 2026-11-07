import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LocationsModule } from './modules/locations/locations.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PartsModule } from './modules/parts/parts.module';
import { HistoryModule } from './modules/history/history.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { WorkOrder } from './modules/work-orders/entities/work-order.entity';
import { WorkOrderPart } from './modules/work-orders/entities/work-order-part.entity';
import { MaintenanceSchedule } from './modules/schedules/entities/maintenance-schedule.entity';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),

    // Redis cache module
    RedisModule,

    // Task scheduler for maintenance cron jobs
    ScheduleModule.forRoot(),

    // Register entities referenced by existing modules, before their APIs are implemented.
    TypeOrmModule.forFeature([WorkOrder, WorkOrderPart, MaintenanceSchedule]),

    // PostgreSQL connection via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'smart_cmms_db'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),

    // SV01 Core Module
    AuthModule,

    // SV02 Modules (Asset, Location, Parts, History)
    LocationsModule,
    AssetsModule,
    PartsModule,
    HistoryModule,
  ],
})
export class AppModule {}
