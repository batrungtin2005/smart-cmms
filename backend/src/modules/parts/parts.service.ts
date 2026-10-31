import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Part } from './entities/part.entity';
import { AssetPartBom } from './entities/asset-part-bom.entity';
import {
  PartTransaction,
  TransactionType,
} from './entities/part-transaction.entity';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';
import {
  AssetHistory,
  MaintenanceEventType,
} from '../history/entities/asset-history.entity';
import {
  AdjustStockDto,
  CreateAssetPartBomDto,
  CreatePartDto,
  IssuePartToAssetDto,
} from './dto/create-part.dto';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(AssetPartBom)
    private readonly bomRepo: Repository<AssetPartBom>,
    @InjectRepository(PartTransaction)
    private readonly txRepo: Repository<PartTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(lowStockOnly = false) {
    const qb = this.partRepo
      .createQueryBuilder('part')
      .where('part.isActive = :isActive', { isActive: true });

    if (lowStockOnly) {
      qb.andWhere('part.currentStock <= part.minimumStock');
    }

    qb.orderBy('part.partCode', 'ASC');
    return qb.getMany();
  }

  async findOne(id: string): Promise<Part> {
    const part = await this.partRepo.findOne({
      where: { id, isActive: true },
      relations: ['bomLinks', 'bomLinks.asset'],
    });

    if (!part) {
      throw new NotFoundException(`Không tìm thấy phụ tùng với ID: ${id}`);
    }

    return part;
  }

  async create(dto: CreatePartDto): Promise<Part> {
    const partCode = dto.partCode.trim().toUpperCase();
    const existing = await this.partRepo.findOne({ where: { partCode } });

    if (existing) {
      throw new ConflictException(`Mã phụ tùng '${partCode}' đã tồn tại!`);
    }

    const part = this.partRepo.create({
      ...dto,
      partCode,
    });

    return this.partRepo.save(part);
  }

  // ================= ĐỊNH MỨC PHỤ TÙNG CHO THIẾT BỊ (BOM) =================
  async createBom(dto: CreateAssetPartBomDto): Promise<AssetPartBom> {
    const existing = await this.bomRepo.findOne({
      where: { assetId: dto.assetId, partId: dto.partId },
    });

    if (existing) {
      Object.assign(existing, dto);
      return this.bomRepo.save(existing);
    }

    const bomItem = this.bomRepo.create(dto);
    return this.bomRepo.save(bomItem);
  }

  async getBomByAsset(assetId: string): Promise<AssetPartBom[]> {
    return this.bomRepo.find({
      where: { assetId },
      relations: ['part'],
      order: { isCritical: 'DESC' },
    });
  }

  // ================= XUẤT / NHẬP KHO VỚI PESSIMISTIC LOCK CHỐNG TỒN ÂM =================
  async adjustStock(partId: string, dto: AdjustStockDto): Promise<PartTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Khóa dòng dữ liệu (Pessimistic Write Lock) ngăn chặn race condition khi nhiều kỹ thuật viên xuất cùng lúc
      const part = await queryRunner.manager.findOne(Part, {
        where: { id: partId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!part) {
        throw new NotFoundException(`Không tìm thấy phụ tùng với ID: ${partId}`);
      }

      const stockBefore = part.currentStock;
      let stockAfter = stockBefore;

      if (dto.transactionType === TransactionType.IMPORT) {
        stockAfter = stockBefore + dto.quantity;
      } else if (dto.transactionType === TransactionType.EXPORT) {
        if (stockBefore < dto.quantity) {
          throw new BadRequestException(
            `Không đủ tồn kho để xuất! Tồn hiện tại: ${stockBefore}, yêu cầu: ${dto.quantity}`,
          );
        }
        stockAfter = stockBefore - dto.quantity;
      } else if (dto.transactionType === TransactionType.ADJUSTMENT) {
        stockAfter = dto.quantity; // Điều chỉnh kiểm kê về giá trị thực
      }

      part.currentStock = stockAfter;
      await queryRunner.manager.save(part);

      // Ghi log biến động kho
      const transaction = queryRunner.manager.create(PartTransaction, {
        partId,
        workOrderId: dto.workOrderId || null,
        transactionType: dto.transactionType,
        quantity: dto.quantity,
        stockBefore,
        stockAfter,
        unitPrice: part.unitPrice,
        referenceCode: dto.referenceCode,
        performedById: dto.performedById || null,
        notes: dto.notes,
      });

      const savedTx = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return savedTx;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // =====================================================================================
  // LOGIC CỐT LÕI: XUẤT PHỤ TÙNG SỬA CHỮA CHO TÀI SẢN
  // 1. Tự động trừ số lượng tồn kho trong bảng parts (Pessimistic Lock chống âm kho)
  // 2. Tự động ghi vết vào bảng part_transactions
  // 3. Tự động ghi 1 dòng mới vào bảng lịch sử sửa chữa asset_maintenance_history
  // =====================================================================================
  async issuePartToAsset(dto: IssuePartToAssetDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Khóa bi quan (Pessimistic Write Lock) trên bản ghi phụ tùng
      const part = await queryRunner.manager.findOne(Part, {
        where: { id: dto.partId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!part) {
        throw new NotFoundException(`Không tìm thấy phụ tùng với ID: ${dto.partId}`);
      }

      // 2. Kiểm tra tồn kho an toàn
      const stockBefore = part.currentStock;
      if (stockBefore < dto.quantity) {
        throw new BadRequestException(
          `Không đủ số lượng phụ tùng trong kho để xuất! Phụ tùng '${part.name}' (Mã: ${part.partCode}) hiện chỉ còn tồn ${stockBefore} ${part.unit}, yêu cầu xuất ${dto.quantity} ${part.unit}.`,
        );
      }

      // 3. Kiểm tra thông tin thiết bị / tài sản nhận phụ tùng
      const asset = await queryRunner.manager.findOne(Asset, {
        where: { id: dto.assetId, isActive: true },
      });

      if (!asset) {
        throw new NotFoundException(`Không tìm thấy tài sản / thiết bị với ID: ${dto.assetId}`);
      }

      // 4. TRỪ SỐ LƯỢNG TỒN KHO TRONG BẢNG PARTS
      const stockAfter = stockBefore - dto.quantity;
      part.currentStock = stockAfter;
      await queryRunner.manager.save(part);

      // 5. GHI LOG BIẾN ĐỘNG KHO (part_transactions)
      const costParts = Number(part.unitPrice) * dto.quantity;
      const partTx = queryRunner.manager.create(PartTransaction, {
        partId: part.id,
        workOrderId: dto.workOrderId || null,
        transactionType: TransactionType.EXPORT,
        quantity: dto.quantity,
        stockBefore,
        stockAfter,
        unitPrice: part.unitPrice,
        referenceCode: dto.workOrderId
          ? `WO-${dto.workOrderId.substring(0, 8).toUpperCase()}`
          : `EXP-${asset.assetCode}`,
        performedById: dto.performedById || null,
        notes: dto.reason || `Xuất ${dto.quantity} ${part.unit} thay thế cho thiết bị ${asset.assetCode} - ${asset.name}`,
      });
      await queryRunner.manager.save(partTx);

      // 6. TỰ ĐỘNG GHI MỘT DÒNG MỚI VÀO BẢNG LỊCH SỬ SỬA CHỮA (AssetHistory)
      const eventType = dto.eventType || MaintenanceEventType.PART_REPLACEMENT;
      const isBreakdown =
        eventType === MaintenanceEventType.BREAKDOWN ||
        eventType === MaintenanceEventType.CORRECTIVE_REPAIR;

      const laborCost = dto.laborCost || 0;
      const totalCost = costParts + laborCost;

      const historyLog = queryRunner.manager.create(AssetHistory, {
        assetId: asset.id,
        workOrderId: dto.workOrderId || null,
        eventType,
        title: `Thay thế phụ tùng ${part.name} (${dto.quantity} ${part.unit})`,
        description:
          dto.reason ||
          `Xuất kho và lắp đặt ${dto.quantity} ${part.unit} ${part.name} (Mã: ${part.partCode}) cho máy ${asset.assetCode}.`,
        repairStartTime: new Date(),
        repairEndTime: new Date(),
        actualRepairTimeHours: dto.actualRepairTimeHours || 0,
        downtimeHours: dto.downtimeHours || 0,
        operatingHoursAtFailure: Number(asset.operatingHours || 0),
        isFailureCounted: isBreakdown,
        failureCause: dto.reason || 'Hao mòn cơ khí / Thay thế phụ tùng định kỳ',
        actionTaken: `Đã thay thế ${dto.quantity} ${part.unit} ${part.name} mới từ kho vào máy.`,
        statusBefore: asset.status,
        statusAfter: AssetStatus.OPERATIONAL,
        partsReplaced: [
          {
            partId: part.id,
            partCode: part.partCode,
            partName: part.name,
            quantity: dto.quantity,
            unitPrice: Number(part.unitPrice),
            totalPrice: costParts,
          },
        ],
        costParts,
        costLabor: laborCost,
        totalCost,
        performedById: dto.performedById || null,
      });

      const savedHistory = await queryRunner.manager.save(historyLog);

      // 7. CẬP NHẬT TRẠNG THÁI THIẾT BỊ NẾU ĐANG DỪNG MÁY / BẢO TRÌ
      if (asset.status !== AssetStatus.OPERATIONAL) {
        asset.status = AssetStatus.OPERATIONAL;
        await queryRunner.manager.save(asset);
      }

      // Hoàn tất transaction toàn vẹn ACID
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Xuất phụ tùng và ghi nhật ký lịch sử bảo trì thành công',
        partIssued: {
          partId: part.id,
          partCode: part.partCode,
          name: part.name,
          quantityIssued: dto.quantity,
          unit: part.unit,
          stockBefore,
          stockAfter,
          isLowStock: stockAfter <= part.minimumStock,
        },
        targetAsset: {
          assetId: asset.id,
          assetCode: asset.assetCode,
          name: asset.name,
          currentStatus: asset.status,
        },
        maintenanceHistoryLog: {
          historyId: savedHistory.id,
          eventType: savedHistory.eventType,
          title: savedHistory.title,
          costParts,
          totalCost,
          recordedAt: savedHistory.createdAt,
        },
      };
    } catch (error) {
      // Rollback toàn bộ nếu có bất kỳ lỗi nào xảy ra
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactions(partId: string): Promise<PartTransaction[]> {
    return this.txRepo.find({
      where: { partId },
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
