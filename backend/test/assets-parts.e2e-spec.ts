import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AssetsController } from '../src/modules/assets/assets.controller';
import { AssetsService } from '../src/modules/assets/assets.service';
import { PartsController } from '../src/modules/parts/parts.controller';
import { PartsService } from '../src/modules/parts/parts.service';
import { PartTransactionsController } from '../src/modules/parts/part-transactions/part-transactions.controller';
import { PartTransactionsService } from '../src/modules/parts/part-transactions/part-transactions.service';
import { AssetStatus, AssetCriticality } from '../src/modules/assets/enums/asset.enums';
import { TransactionType } from '../src/modules/parts/entities/part-transaction.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('Assets & Parts Modules (E2E API Tests)', () => {
  let app: INestApplication;

  const mockAssetId = 'a0000000-0000-4000-8000-000000000001';
  const mockPartId = 'b0000000-0000-4000-8000-000000000001';

  const mockAssetsService = {
    findAll: jest.fn().mockImplementation((query) => Promise.resolve({
      data: [{
        id: mockAssetId,
        assetCode: 'AST-001',
        name: 'Máy Phay CNC 5 Trục Makino',
        category: 'Gia công CNC',
        status: AssetStatus.OPERATIONAL,
        criticality: AssetCriticality.CRITICAL,
      }],
      meta: { total: 1, page: Number(query?.page) || 1, limit: Number(query?.limit) || 10, totalPages: 1 },
    })),
    findOne: jest.fn().mockImplementation((id) => {
      if (id === mockAssetId) {
        return Promise.resolve({
          id: mockAssetId,
          assetCode: 'AST-001',
          name: 'Máy Phay CNC 5 Trục Makino',
          category: 'Gia công CNC',
          status: AssetStatus.OPERATIONAL,
        });
      }
      return Promise.reject(new Error('Asset not found'));
    }),
    create: jest.fn().mockImplementation((dto) => Promise.resolve({
      id: mockAssetId,
      ...dto,
      status: dto.status || AssetStatus.OPERATIONAL,
      criticality: dto.criticality || AssetCriticality.MEDIUM,
      createdAt: new Date(),
    })),
    update: jest.fn().mockImplementation((id, dto) => Promise.resolve({
      id,
      assetCode: 'AST-001',
      ...dto,
      updatedAt: new Date(),
    })),
    remove: jest.fn().mockResolvedValue({
      success: true,
      message: 'Đã vô hiệu hóa thành công tài sản AST-001',
    }),
    getOverview: jest.fn().mockResolvedValue({
      totalAssets: 300,
      statusBreakdown: {
        OPERATIONAL: 250,
        MAINTENANCE: 35,
        DOWN: 15,
        DECOMMISSIONED: 0,
      },
      criticalityBreakdown: {
        CRITICAL: 60,
        HIGH: 120,
        MEDIUM: 90,
        LOW: 30,
      },
      metrics: {
        totalOperatingHours: 450000,
        avgMttrHours: 2.15,
        avgMtbfHours: 1250.5,
      },
    }),
    getQrCodeData: jest.fn().mockResolvedValue({
      success: true,
      assetId: mockAssetId,
      assetCode: 'AST-001',
      qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA',
      printLabel: { company: 'ZENTECH SMART CMMS', title: 'TEM ĐỊNH DANH THIẾT BỊ', assetCode: 'AST-001' },
    }),
  };

  const mockPartsService = {
    findAll: jest.fn().mockImplementation((query) => Promise.resolve({
      data: [{
        id: mockPartId,
        partCode: 'PART-001',
        name: 'Vòng bi SKF 6205-2RSH',
        category: 'Vòng bi',
        unit: 'Cái',
        unitPrice: 125000,
        currentStock: 25,
        quantityOnHand: 25,
        minimumStock: 5,
      }],
      meta: { total: 1, page: Number(query?.page) || 1, limit: Number(query?.limit) || 10, totalPages: 1 },
    })),
    findOne: jest.fn().mockImplementation((id) => {
      if (id === mockPartId) {
        return Promise.resolve({
          id: mockPartId,
          partCode: 'PART-001',
          name: 'Vòng bi SKF 6205-2RSH',
          currentStock: 25,
          quantityOnHand: 25,
          minimumStock: 5,
        });
      }
      return Promise.reject(new Error('Part not found'));
    }),
    create: jest.fn().mockImplementation((dto) => Promise.resolve({
      id: mockPartId,
      ...dto,
      currentStock: dto.currentStock || 0,
      minimumStock: dto.minimumStock || 5,
      createdAt: new Date(),
    })),
    update: jest.fn().mockImplementation((id, dto) => Promise.resolve({
      id,
      partCode: 'PART-001',
      ...dto,
      updatedAt: new Date(),
    })),
    remove: jest.fn().mockResolvedValue({
      success: true,
      message: 'Đã vô hiệu hóa thành công phụ tùng PART-001',
    }),
    getLowStockAlerts: jest.fn().mockResolvedValue({
      alertCount: 2,
      alerts: [
        { partCode: 'PART-011', name: 'Phớt ben thủy lực Parker', currentStock: 2, minimumStock: 10, severity: 'WARNING_LOW_STOCK' },
        { partCode: 'PART-041', name: 'Biến tần Yaskawa GA700', currentStock: 0, minimumStock: 2, severity: 'CRITICAL_OUT_OF_STOCK' },
      ],
    }),
    getInventoryOverview: jest.fn().mockResolvedValue({
      totalPartTypes: 60,
      totalQuantityOnHand: 3450,
      totalInventoryValueVNĐ: 185000000,
      lowStockCount: 3,
      outOfStockCount: 1,
      needsReorder: true,
    }),
  };

  const mockTransactionsService = {
    importStock: jest.fn().mockImplementation((dto) => Promise.resolve({
      success: true,
      message: 'Ghi nhận nhập kho thành công',
      transaction: {
        id: 'tx-import-001',
        partId: dto.partId,
        transactionType: TransactionType.IMPORT,
        quantity: dto.quantity,
        stockBefore: 20,
        stockAfter: 20 + dto.quantity,
        unitPrice: dto.unitPrice || 125000,
        referenceCode: dto.referenceCode || 'PNK-2026-001',
      },
      part: {
        id: dto.partId,
        partCode: 'PART-001',
        currentStock: 20 + dto.quantity,
      },
    })),
    exportStockForProduction: jest.fn().mockImplementation((dto) => {
      // Giả lập kiểm soát tồn kho âm
      const currentStock = 20;
      if (dto.quantity > currentStock) {
        throw new Error(`Không đủ tồn kho để xuất! Tồn hiện tại: ${currentStock}, yêu cầu: ${dto.quantity}`);
      }
      return Promise.resolve({
        success: true,
        message: 'Xuất kho cho Lệnh sản xuất thành công',
        transaction: {
          id: 'tx-export-001',
          partId: dto.partId,
          transactionType: TransactionType.EXPORT,
          quantity: dto.quantity,
          stockBefore: currentStock,
          stockAfter: currentStock - dto.quantity,
          referenceCode: dto.productionOrderCode || dto.referenceCode || 'LSX-2026-001',
        },
        part: {
          id: dto.partId,
          partCode: 'PART-001',
          currentStock: currentStock - dto.quantity,
        },
      });
    }),
    findAll: jest.fn().mockImplementation((query) => Promise.resolve({
      data: [{
        id: 'tx-001',
        partId: mockPartId,
        transactionType: TransactionType.IMPORT,
        quantity: 50,
        referenceCode: 'PNK-2026-001',
        createdAt: new Date(),
      }],
      meta: { total: 1, page: Number(query?.page) || 1, limit: Number(query?.limit) || 10, totalPages: 1 },
    })),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController, PartsController, PartTransactionsController],
      providers: [
        { provide: AssetsService, useValue: mockAssetsService },
        { provide: PartsService, useValue: mockPartsService },
        { provide: PartTransactionsService, useValue: mockTransactionsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'u0000000-0000-4000-8000-000000000001', role: 'ADMIN', username: 'admin' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ================= 1. ASSET MODULE E2E TESTS =================
  describe('Assets API (/api/v1/assets)', () => {
    it('GET /api/v1/assets - Lấy danh sách thiết bị có phân trang', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/assets?page=1&limit=10')
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.meta.total).toBe(1);
    });

    it('GET /api/v1/assets/overview - Lấy tổng quan KPI thiết bị', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/assets/overview')
        .expect(HttpStatus.OK);

      expect(res.body.data.totalAssets).toBe(300);
      expect(res.body.data.statusBreakdown.OPERATIONAL).toBe(250);
      expect(res.body.data.metrics.avgMttrHours).toBe(2.15);
    });

    it('GET /api/v1/assets/:id - Xem chi tiết thiết bị theo UUID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/assets/${mockAssetId}`)
        .expect(HttpStatus.OK);

      expect(res.body.data.assetCode).toBe('AST-001');
      expect(res.body.data.name).toBe('Máy Phay CNC 5 Trục Makino');
    });

    it('POST /api/v1/assets - Tạo thiết bị mới thành công (201 Created)', async () => {
      const newAsset = {
        assetCode: 'AST-301',
        name: 'Máy Cắt Laser Fiber 15kW Zentech',
        category: 'Gia công CNC',
        status: AssetStatus.OPERATIONAL,
        criticality: AssetCriticality.CRITICAL,
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/assets')
        .send(newAsset)
        .expect(HttpStatus.CREATED);

      expect(res.body.data.assetCode).toBe('AST-301');
      expect(mockAssetsService.create).toHaveBeenCalled();
    });

    it('POST /api/v1/assets - Từ chối khi thiếu trường bắt buộc (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/assets')
        .send({ name: 'Chỉ có tên, thiếu mã và danh mục' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('PATCH /api/v1/assets/:id - Cập nhật thiết bị thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/assets/${mockAssetId}`)
        .send({ name: 'Máy Phay CNC Nâng Cấp Bàn Xoay Trục B' })
        .expect(HttpStatus.OK);

      expect(res.body.data.name).toBe('Máy Phay CNC Nâng Cấp Bàn Xoay Trục B');
    });

    it('DELETE /api/v1/assets/:id - Xóa mềm thiết bị thành công', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/assets/${mockAssetId}`)
        .expect(HttpStatus.OK);

      expect(res.body.data.success).toBe(true);
    });

    it('GET /api/v1/assets/:id/qr-code - Lấy dữ liệu mã QR Base64 của máy', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/assets/${mockAssetId}/qr-code`)
        .expect(HttpStatus.OK);

      expect(res.body.data.qrDataUrl).toBeDefined();
      expect(res.body.data.printLabel.company).toBe('ZENTECH SMART CMMS');
    });
  });

  // ================= 2. PART MODULE E2E TESTS =================
  describe('Parts API (/api/v1/parts)', () => {
    it('GET /api/v1/parts - Lấy danh mục phụ tùng', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/parts?page=1&limit=10')
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.data[0].partCode).toBe('PART-001');
    });

    it('GET /api/v1/parts/overview - Tổng quan giá trị kho phụ tùng', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/parts/overview')
        .expect(HttpStatus.OK);

      expect(res.body.data.totalPartTypes).toBe(60);
      expect(res.body.data.totalInventoryValueVNĐ).toBe(185000000);
      expect(res.body.data.needsReorder).toBe(true);
    });

    it('GET /api/v1/parts/alerts/low-stock - Lấy danh sách cảnh báo tồn kho tối thiểu', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/parts/alerts/low-stock')
        .expect(HttpStatus.OK);

      expect(res.body.data.alertCount).toBe(2);
      expect(res.body.data.alerts[0].severity).toBe('WARNING_LOW_STOCK');
    });

    it('POST /api/v1/parts - Tạo mã phụ tùng mới (201 Created)', async () => {
      const newPart = {
        partCode: 'PART-061',
        name: 'Vòng bi tự lựa FAG 22220-E1',
        category: 'Vòng bi',
        unit: 'Cái',
        unitPrice: 2100000,
        currentStock: 12,
        minimumStock: 4,
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/parts')
        .send(newPart)
        .expect(HttpStatus.CREATED);

      expect(res.body.data.partCode).toBe('PART-061');
    });

    it('POST /api/v1/parts - Từ chối khi partCode rỗng (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/parts')
        .send({ name: 'Không có mã', category: 'Vòng bi' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ================= 3. PART TRANSACTION E2E TESTS =================
  describe('Part Transactions API (/api/v1/part-transactions)', () => {
    it('POST /api/v1/part-transactions/import - Nhập kho vật tư đầu vào (201 Created)', async () => {
      const importPayload = {
        partId: mockPartId,
        quantity: 30,
        unitPrice: 120000,
        referenceCode: 'PNK-2026-0099',
        supplierInfo: 'SKF Vietnam Authorized Distributor',
        notes: 'Nhập lô bạc đạn đợt 2 theo kế hoạch',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/part-transactions/import')
        .send(importPayload)
        .expect(HttpStatus.CREATED);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.transaction.quantity).toBe(30);
      expect(res.body.data.part.currentStock).toBe(50);
    });

    it('POST /api/v1/part-transactions/export - Xuất kho cho Lệnh sản xuất thành công', async () => {
      const exportPayload = {
        partId: mockPartId,
        quantity: 5,
        productionOrderCode: 'LSX-2026-001',
        reason: 'Xuất phục vụ bảo dưỡng chuyền cán nguội',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/part-transactions/export')
        .send(exportPayload)
        .expect(HttpStatus.OK);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.transaction.quantity).toBe(5);
      expect(res.body.data.part.currentStock).toBe(15);
    });

    it('GET /api/v1/part-transactions - Truy vấn lịch sử biến động kho có phân trang', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/part-transactions?page=1&limit=10')
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });
  });
});
