import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for React Web & Mobile Flutter
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix: /api/v1
  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configure Swagger OpenAPI
  const config = new DocumentBuilder()
    .setTitle('DT05 - Smart CMMS API')
    .setDescription(
      'Hệ thống quản lý vận hành bảo trì thiết bị và tài sản kỹ thuật - Zentech Company\n\n' +
      'Tài liệu API chính thức phục vụ Web Admin (SV04) và Mobile Flutter (SV05).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT Token tại đây để gọi API được bảo vệ',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Đăng nhập, cấp quyền và thông tin tài khoản')
    .addTag('Assets', 'Quản lý 300+ thiết bị, vị trí và in mã QR (SV02)')
    .addTag('Parts', 'Quản lý phụ tùng, kiểm soát tồn kho và giao dịch xuất nhập (SV02)')
    .addTag('Work Orders', 'Quy trình xử lý phiếu bảo dưỡng/sửa chữa (SV03)')
    .addTag('Maintenance Schedules', 'Lập lịch bảo dưỡng dự phòng 3 kiểu (SV03)')
    .addTag('Reports & KPI', 'Thống kê MTTR, MTBF, tình trạng thiết bị (SV03)')
    .addTag('Sync Offline', 'API tiếp nhận đồng bộ offline theo lô với Idempotency Key (SV03/SV05)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Smart CMMS Backend API is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📖 Swagger API Documentation is available at: http://localhost:${port}/api/docs`);
}

bootstrap();
