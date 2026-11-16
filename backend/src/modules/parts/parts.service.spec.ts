import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { PartsService } from './parts.service';
import { Part, PartStatus } from './entities/part.entity';
import { TransactionType } from './entities/part-transaction.entity';
import {
  AdjustStockDto,
  CreatePartDto,
  IssuePartToAssetDto,
  QueryPartDto,
} from './dto/create-part.dto';

describe('PartsService (Unit Tests)', () => {
  let service: PartsService;
  let partRepo: any;
  let bomRepo: any;
  let txRepo: any;
  let dataSource: any;
  let queryRunner: any;

  const mockPart: Partial<Part> = {
    id: 'b0000000-0000-0000-0000-000000000001',
    partCode: 'PART-001',
    name: 'Vòng bi SKF 6205-2RSH',
    category: 'Vòng bi',
    unit: 'Cái',
    unitPrice: 125000,
    currentStock: 20,
    minimumStock: 5,
    shelfLocation: 'Kệ A1-T1-01',
    supplierInfo: 'SKF Authorized Distributor VN',
    isActive: true,
  };

  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  beforeEach(() => {
    partRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    bomRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    txRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        create: jest.fn((entityClass, data) => data),
        save: jest.fn((entity) => Promise.resolve(entity)),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getExists: jest.fn().mockResolvedValue(false),
          }),
        }),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    service = new PartsService(partRepo, bomRepo, txRepo, dataSource);
  });

  describe('DTO Validation Rules', () => {
    it('chấp nhận DTO tạo phụ tùng hợp lệ', async () => {
      const validDto = {
        partCode: 'PART-999',
        name: 'Vòng bi NSK 6000',
        category: 'Vòng bi',
        unit: 'Cái',
        unitPrice: 85000,
        currentStock: 50,
        minimumStock: 10,
      };
      const res = await validationPipe.transform(validDto, {
        type: 'body',
        metatype: CreatePartDto,
      });
      expect(res.partCode).toBe('PART-999');
      expect(res.unitPrice).toBe(85000);
    });

    it('từ chối khi thiếu partCode hoặc name', async () => {
      await expect(
        validationPipe.transform(
          { name: 'Không có mã', category: 'Cơ khí' },
          { type: 'body', metatype: CreatePartDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('từ chối số lượng biến động <= 0 trong AdjustStockDto', async () => {
      await expect(
        validationPipe.transform(
          { transactionType: TransactionType.IMPORT, quantity: 0 },
          { type: 'body', metatype: AdjustStockDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('từ chối IssuePartToAssetDto khi thiếu UUID hoặc số lượng <= 0', async () => {
      await expect(
        validationPipe.transform(
          { partId: 'invalid-id', assetId: 'not-uuid', quantity: -1 },
          { type: 'body', metatype: IssuePartToAssetDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create()', () => {
    it('ném lỗi ConflictException nếu partCode đã tồn tại', async () => {
      partRepo.findOne.mockResolvedValue(mockPart);
      await expect(
        service.create({
          partCode: 'PART-001',
          name: 'Vòng bi SKF',
          category: 'Vòng bi',
        } as CreatePartDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('tạo phụ tùng mới thành công khi partCode chưa tồn tại', async () => {
      partRepo.findOne.mockResolvedValue(null);
      partRepo.create.mockReturnValue(mockPart);
      partRepo.save.mockResolvedValue(mockPart);

      const result = await service.create({
        partCode: 'PART-001',
        name: 'Vòng bi SKF 6205-2RSH',
        category: 'Vòng bi',
        quantityOnHand: 20,
      } as CreatePartDto);

      expect(result).toEqual(mockPart);
      expect(partRepo.save).toHaveBeenCalled();
    });
  });

  describe('findOne()', () => {
    it('trả về chi tiết phụ tùng và thuộc tính tính toán quantityOnHand, stockStatus', async () => {
      partRepo.findOne.mockResolvedValue({ ...mockPart, currentStock: 20, minimumStock: 5 });
      const part = await service.findOne(mockPart.id as string);
      expect(part.partCode).toBe('PART-001');
      expect(part.quantityOnHand).toBe(20);
      expect(part.stockStatus).toBe(PartStatus.IN_STOCK);
    });

    it('ném NotFoundException nếu không tìm thấy phụ tùng', async () => {
      partRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll()', () => {
    it('lấy danh sách phụ tùng kèm phân trang và lọc lowStock', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPart], 1]),
      };
      partRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 10, lowStockOnly: true } as QueryPartDto);
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(qb.andWhere).toHaveBeenCalledWith('part.currentStock <= part.minimumStock');
    });
  });

  describe('getLowStockAlerts()', () => {
    it('lấy danh sách phụ tùng dưới ngưỡng tồn kho an toàn và phân loại severity', async () => {
      const lowStockList = [
        { ...mockPart, currentStock: 2, minimumStock: 5 },
        { ...mockPart, id: 'b2', partCode: 'PART-002', currentStock: 0, minimumStock: 10 },
      ];
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockList),
      };
      partRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.getLowStockAlerts();
      expect(res.alertCount).toBe(2);
      expect(res.alerts[0].severity).toBe('WARNING_LOW_STOCK');
      expect(res.alerts[0].shortageQuantity).toBe(3);
      expect(res.alerts[1].severity).toBe('CRITICAL_OUT_OF_STOCK');
    });
  });

  describe('getInventoryOverview()', () => {
    it('tính toán tổng số loại, tổng tồn kho và tổng giá trị kho hàng VNĐ', async () => {
      const parts = [
        { ...mockPart, currentStock: 10, unitPrice: 100000, minimumStock: 5 },
        { ...mockPart, id: 'b2', currentStock: 5, unitPrice: 200000, minimumStock: 5 },
        { ...mockPart, id: 'b3', currentStock: 0, unitPrice: 500000, minimumStock: 5 },
      ];
      partRepo.find.mockResolvedValue(parts);

      const res = await service.getInventoryOverview();
      expect(res.overview.totalPartTypes).toBe(3);
      expect(res.overview.totalQuantityOnHand).toBe(15);
      // Total value: (10 * 100000) + (5 * 200000) + 0 = 2,000,000
      expect(res.overview.totalInventoryValueVNĐ).toBe(2000000);
      expect(res.overview.lowStockCount).toBe(1);
      expect(res.overview.outOfStockCount).toBe(1);
      expect(res.overview.needsReorder).toBe(true);
    });
  });

  describe('adjustStock() (Khóa giao dịch chống tồn kho âm)', () => {
    it('tăng tồn kho khi thực hiện IMPORT với Pessimistic Write Lock', async () => {
      const currentPart = { ...mockPart, currentStock: 10 };
      queryRunner.manager.findOne.mockResolvedValue(currentPart);

      const res = await service.adjustStock(mockPart.id as string, {
        transactionType: TransactionType.IMPORT,
        quantity: 15,
        referenceCode: 'PNK-001',
      });

      expect(currentPart.currentStock).toBe(25);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(res.stockBefore).toBe(10);
      expect(res.stockAfter).toBe(25);
    });

    it('NÉM LỖI BadRequestException KHI XUẤT VƯỢT TỒN KHO THỰC TẾ (Chống tồn kho âm)', async () => {
      const currentPart = { ...mockPart, currentStock: 5 };
      queryRunner.manager.findOne.mockResolvedValue(currentPart);

      await expect(
        service.adjustStock(mockPart.id as string, {
          transactionType: TransactionType.EXPORT,
          quantity: 10, // Yêu cầu 10 trong khi chỉ còn 5!
          referenceCode: 'PXK-001',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('issuePartToAsset() (Giao dịch xuất phụ tùng sửa chữa)', () => {
    it('từ chối và rollback nếu số lượng tồn kho không đủ để xuất', async () => {
      const currentPart = { ...mockPart, currentStock: 2 };
      queryRunner.manager.findOne.mockResolvedValue(currentPart);

      await expect(
        service.issuePartToAsset({
          partId: mockPart.id as string,
          assetId: 'a0000000-0000-0000-0000-000000000001',
          quantity: 5, // Cần 5 trong khi chỉ có 2!
        }),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('xuất kho thành công và cập nhật tồn kho an toàn khi đủ số lượng', async () => {
      const currentPart = { ...mockPart, currentStock: 10, unit: 'Cái', unitPrice: 125000 };
      const currentAsset = {
        id: 'a0000000-0000-0000-0000-000000000001',
        assetCode: 'AST-001',
        name: 'Máy Phay CNC',
        status: 'DOWN',
        operatingHours: 1200,
      };

      queryRunner.manager.findOne
        .mockResolvedValueOnce(currentPart) // find Part
        .mockResolvedValueOnce(currentAsset); // find Asset

      const result = await service.issuePartToAsset({
        partId: mockPart.id as string,
        assetId: currentAsset.id,
        quantity: 2,
        reason: 'Thay bạc đạn puly do mòn',
      });

      expect(result.success).toBe(true);
      expect(result.partIssued.stockBefore).toBe(10);
      expect(result.partIssued.stockAfter).toBe(8);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
