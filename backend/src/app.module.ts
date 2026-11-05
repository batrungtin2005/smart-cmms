import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { LocationsModule } from './modules/locations/locations.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PartsModule } from './modules/parts/parts.module';
import { HistoryModule } from './modules/history/history.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    // Biến môi trường toàn cục
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),

    // Module Caching Redis toàn cục
    RedisModule,

    // Bộ lập lịch tự động (Cron job cho bảo dưỡng định kỳ)
    ScheduleModule.forRoot(),

    // Cấu hình kết nối PostgreSQL qua TypeORM
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

    // Module do SV02 phụ trách (Asset, Location, Parts, History)
    LocationsModule,
    AssetsModule,
    PartsModule,
    HistoryModule,

    // TODO: Các thành viên khi code module của mình sẽ import tiếp vào đây:
    // AuthModule (SV01 - Leader phụ trách)
    // WorkOrdersModule, SchedulesModule, ReportsModule, SyncModule (SV03 phụ trách)
  ],
})
export class AppModule {}
