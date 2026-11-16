import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Asset, AssetCriticality, AssetStatus } from './entities/asset.entity';
import { CreateAssetDto, QueryAssetDto, UpdateAssetDto } from './dto/create-asset.dto';
import { QrCodeUtil } from '../../common/utils/qr-code.util';

describe('AssetsService (Unit Tests)', () => {
  let service: AssetsService;
  let assetRepo: any;
  let historyRepo: any;
  let redisService: any;
  let mockManager: any;

  const mockAsset: Partial<Asset> = {
    id: 'a0000000-0000-0000-0000-000000000001',
    assetCode: 'AST-001',
    name: 'Máy Phay CNC 5 Trục Makino',
    category: 'Gia công CNC',
    manufacturer: 'Makino',
    model: 'D500-5X',
    serialNumber: 'SN-MAK-2023-0001',
    status: AssetStatus.OPERATIONAL,
    criticality: AssetCriticality.CRITICAL,
    operatingHours: 2500,
    totalFailures: 2,
    totalRepairTimeHours: 4.5,
    cachedMttrHours: 2.25,
    cachedMtbfHours: 1250,
    isActive: true,
    specifications: { power_kw: 25, voltage_v: 380 },
  };

  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  beforeEach(() => {
    mockManager = {
      findOne: jest.fn(),
      findOneByOrFail: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getExists: jest.fn().mockResolvedValue(false),
        }),
      }),
    };

    assetRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn((cb: any) => cb(mockManager)),
      },
    };

    historyRepo = {
      find: jest.fn(),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };

    service = new AssetsService(assetRepo, historyRepo, redisService);
  });

  describe('DTO Validation Rules', () => {
    it('chấp nhận input hợp lệ khi tạo Asset', async () => {
      const validDto = {
        assetCode: 'AST-999',
        name: 'Máy Tiện CNC Doosan',
        category: 'Gia công CNC',
        status: AssetStatus.OPERATIONAL,
        criticality: AssetCriticality.HIGH,
      };
      const result = await validationPipe.transform(validDto, {
        type: 'body',
        metatype: CreateAssetDto,
      });
      expect(result.assetCode).toBe('AST-999');
      expect(result.name).toBe('Máy Tiện CNC Doosan');
    });

    it('từ chối tạo Asset khi thiếu các trường bắt buộc', async () => {
      const invalidDto = { name: 'Máy Thiếu Mã' };
      await expect(
        validationPipe.transform(invalidDto, {
          type: 'body',
          metatype: CreateAssetDto,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('từ chối query phân trang không hợp lệ', async () => {
      await expect(
        validationPipe.transform(
          { page: '0', limit: '10' },
          { type: 'query', metatype: QueryAssetDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create()', () => {
    it('ném lỗi ConflictException nếu assetCode đã tồn tại', async () => {
      assetRepo.findOne.mockResolvedValue(mockAsset);
      await expect(
        service.create({
          assetCode: 'AST-001',
          name: 'Máy Phay Mới',
          category: 'CNC',
        } as CreateAssetDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('tạo mới thành công và xóa cache khi assetCode chưa tồn tại', async () => {
      assetRepo.findOne.mockResolvedValue(null);
      assetRepo.create.mockReturnValue(mockAsset);
      assetRepo.save.mockResolvedValue(mockAsset);

      const result = await service.create({
        assetCode: 'AST-001',
        name: 'Máy Phay CNC 5 Trục Makino',
        category: 'Gia công CNC',
      } as CreateAssetDto);

      expect(result).toEqual(mockAsset);
      expect(assetRepo.save).toHaveBeenCalled();
      expect(redisService.delByPattern).toHaveBeenCalledWith('assets:*');
    });
  });

  describe('findOne()', () => {
    it('trả về chi tiết tài sản nếu tìm thấy', async () => {
      assetRepo.findOne.mockResolvedValue(mockAsset);
      const result = await service.findOne(mockAsset.id as string);
      expect(result).toEqual(mockAsset);
    });

    it('ném lỗi NotFoundException nếu không tìm thấy ID', async () => {
      assetRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('invalid-uuid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll()', () => {
    it('trả về danh sách từ PostgreSQL khi Cache Miss', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockAsset], 1]),
      };
      assetRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toEqual([mockAsset]);
      expect(result.meta.total).toBe(1);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('trả về dữ liệu từ Redis Cache khi Cache Hit', async () => {
      const cached = {
        data: [mockAsset],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      redisService.get.mockResolvedValue(cached);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toEqual([mockAsset]);
      expect(result.meta.fromCache).toBe(true);
      expect(assetRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('cập nhật thành công thông tin thiết bị', async () => {
      mockManager.findOne.mockResolvedValue({ ...mockAsset });
      mockManager.findOneByOrFail.mockResolvedValue({ ...mockAsset, name: 'Máy Phay Đã Nâng Cấp Trục Z' });

      const updated = await service.update(mockAsset.id as string, {
        name: 'Máy Phay Đã Nâng Cấp Trục Z',
      } as UpdateAssetDto);

      expect(updated.name).toBe('Máy Phay Đã Nâng Cấp Trục Z');
      expect(redisService.delByPattern).toHaveBeenCalledWith('assets:*');
    });

    it('ném lỗi NotFoundException khi cập nhật thiết bị không tồn tại', async () => {
      mockManager.findOne.mockResolvedValue(null);
      await expect(
        service.update('non-existing', { name: 'Test' } as UpdateAssetDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove() (Soft Delete)', () => {
    it('đánh dấu isActive = false khi xóa mềm tài sản', async () => {
      const assetToSoftDelete = { ...mockAsset, isActive: true };
      assetRepo.findOne.mockResolvedValue(assetToSoftDelete);
      assetRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const res = await service.remove(mockAsset.id as string);
      expect(res.success).toBe(true);
      expect(assetRepo.update).toHaveBeenCalledWith(mockAsset.id, { isActive: false });
      expect(redisService.delByPattern).toHaveBeenCalledWith('assets:*');
    });
  });

  describe('getOverview()', () => {
    it('tính toán chính xác các chỉ số KPI: tổng máy, breakdown trạng thái và độ tin cậy', async () => {
      const assetsList = [
        { ...mockAsset, status: AssetStatus.OPERATIONAL, criticality: AssetCriticality.CRITICAL, totalFailures: 1, cachedMttrHours: 2, cachedMtbfHours: 1000 },
        { ...mockAsset, id: 'a2', status: AssetStatus.OPERATIONAL, criticality: AssetCriticality.HIGH, totalFailures: 0, cachedMttrHours: 0, cachedMtbfHours: 2000 },
        { ...mockAsset, id: 'a3', status: AssetStatus.MAINTENANCE, criticality: AssetCriticality.MEDIUM, totalFailures: 2, cachedMttrHours: 3, cachedMtbfHours: 500 },
        { ...mockAsset, id: 'a4', status: AssetStatus.DOWN, criticality: AssetCriticality.CRITICAL, totalFailures: 1, cachedMttrHours: 4, cachedMtbfHours: 800 },
      ];
      assetRepo.find.mockResolvedValue(assetsList);

      const overview = await service.getOverview();
      expect(overview.totalAssets).toBe(4);
      expect(overview.statusBreakdown.OPERATIONAL).toBe(2);
      expect(overview.statusBreakdown.MAINTENANCE).toBe(1);
      expect(overview.statusBreakdown.DOWN).toBe(1);
      expect(overview.criticalityBreakdown.CRITICAL).toBe(2);
      expect(overview.metrics.totalOperatingHours).toBeGreaterThan(0);
      expect(overview.metrics.avgMttrHours).toBeGreaterThan(0);
      expect(overview.metrics.avgMtbfHours).toBeGreaterThan(0);
    });
  });

  describe('getQrCodeData()', () => {
    it('sinh mã QR dạng Base64 DataURL thành công', async () => {
      jest.spyOn(QrCodeUtil, 'toDataURL').mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA');
      assetRepo.findOne.mockResolvedValue(mockAsset);
      const qrResult = await service.getQrCodeData(mockAsset.id as string);
      expect(qrResult.assetCode).toBe(mockAsset.assetCode);
      expect(qrResult.qrDataUrl).toBeDefined();
      expect(qrResult.qrDataUrl).toContain('data:image/png;base64,');
      expect(qrResult.printLabel.company).toBe('ZENTECH SMART CMMS');
    });
  });
});
