import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // Biến môi trường toàn cục
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),

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

    // TODO: Các thành viên khi code module của mình sẽ import vào đây:
    // AuthModule (SV01 - Leader phụ trách)
    // AssetsModule, LocationsModule, PartsModule, HistoryModule (SV02 phụ trách)
    // WorkOrdersModule, SchedulesModule, ReportsModule, SyncModule (SV03 phụ trách)
  ],
})
export class AppModule {}
