import { WorkOrder } from '../work-orders/entities/work-order.entity';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Part, PartStatus } from './entities/part.entity';
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
  QueryPartDto,
  UpdatePartDto,
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

  /**
   * 1. LẤY DANH SÁCH PHỤ TÙNG (Hỗ trợ phân trang, tìm kiếm, lọc danh mục, cảnh báo hết hàng)
   */
  async findAll(query?: QueryPartDto) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const qb = this.partRepo
      .createQueryBuilder('part')
      .where('part.isActive = :isActive', { isActive: true });

    // Tìm kiếm đa năng: Mã phụ tùng, Tên, Danh mục, Kệ kho, Nhà cung cấp
    if (query?.search) {
      qb.andWhere(
        '(part.partCode ILIKE :search OR part.name ILIKE :search OR part.category ILIKE :search OR part.shelfLocation ILIKE :search OR part.supplierInfo ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Lọc theo danh mục
    if (query?.category) {
      qb.andWhere('part.category ILIKE :category', {
        category: `%${query.category}%`,
      });
    }

    // Lọc danh sách sắp hết hàng (currentStock <= minimumStock)
    const isLowStock =
      query?.lowStockOnly === true || query?.lowStockOnly === 'true';
    if (isLowStock) {
      qb.andWhere('part.currentStock <= part.minimumStock');
    }

    qb.orderBy('part.partCode', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const formattedData = items.map((part) => ({
      ...part,
      quantityOnHand: part.currentStock,
      stockStatus:
        part.currentStock <= 0
          ? PartStatus.OUT_OF_STOCK
          : part.currentStock <= part.minimumStock
            ? PartStatus.LOW_STOCK
            : PartStatus.IN_STOCK,
    }));

    return {
      success: true,
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 2. XEM CHI TIẾT MỘT PHỤ TÙNG
   */
  async findOne(id: string): Promise<any> {
    const part = await this.partRepo.findOne({
      where: { id, isActive: true },
      relations: ['bomLinks', 'bomLinks.asset'],
    });

    if (!part) {
      throw new NotFoundException(`Không tìm thấy phụ tùng với ID: ${id}`);
    }

    return {
      ...part,
      quantityOnHand: part.currentStock,
      stockStatus:
        part.currentStock <= 0
          ? PartStatus.OUT_OF_STOCK
          : part.currentStock <= part.minimumStock
            ? PartStatus.LOW_STOCK
            : PartStatus.IN_STOCK,
    };
  }

  /**
   * 3. THÊM MỚI PHỤ TÙNG VÀO DANH MỤC KHO
   */
  async create(dto: CreatePartDto): Promise<Part> {
    const partCode = dto.partCode.trim().toUpperCase();
    const existing = await this.partRepo.findOne({ where: { partCode } });

    if (existing) {
      throw new ConflictException(`Mã phụ tùng '${partCode}' đã tồn tại!`);
    }

    // Hỗ trợ cả 2 tên trường: quantity_on_hand hoặc current_stock
    const initialStock = dto.quantityOnHand !== undefined ? dto.quantityOnHand : (dto.currentStock || 0);

    const part = this.partRepo.create({
      ...dto,
      partCode,
      currentStock: initialStock,
      minimumStock: dto.minimumStock !== undefined ? dto.minimumStock : 5,
    });

    return this.partRepo.save(part);
  }

  /**
   * 4. CẬP NHẬT THÔNG TIN PHỤ TÙNG
   */
  async update(id: string, dto: UpdatePartDto): Promise<Part> {
    const part = await this.partRepo.findOne({ where: { id, isActive: true } });
    if (!part) {
      throw new NotFoundException(`Không tìm thấy phụ tùng với ID: ${id}`);
    }

    // Update only catalog fields; do not overwrite stock changed by a concurrent issue.
    await this.partRepo.update(id, dto);
    return this.partRepo.findOneByOrFail({ id });
  }

  /**
   * 5. VÔ HIỆU HÓA PHỤ TÙNG (SOFT DELETE)
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const part = await this.partRepo.findOne({ where: { id, isActive: true } });
    if (!part) {
      throw new NotFoundException(`Không tìm thấy phụ tùng với ID: ${id}`);
    }

    await this.partRepo.update(id, { isActive: false });

    return {
      success: true,
      message: `Đã vô hiệu hóa thành công phụ tùng ${part.partCode} - ${part.name}`,
    };
  }

  /**
   * 6. LẤY DANH SÁCH CẢNH BÁO TỒN KHO DƯỚI NGƯỠNG AN TOÀN (LOW STOCK ALERTS)
   */
  async getLowStockAlerts() {
    const lowStockParts = await this.partRepo
      .createQueryBuilder('part')
      .where('part.isActive = :isActive', { isActive: true })
      .andWhere('part.currentStock <= part.minimumStock')
      .orderBy('part.currentStock', 'ASC')
      .getMany();

    return {
      success: true,
      alertCount: lowStockParts.length,
      alerts: lowStockParts.map((p) => ({
        partId: p.id,
        partCode: p.partCode,
        name: p.name,
        category: p.category,
        unit: p.unit,
        unitPrice: Number(p.unitPrice),
        currentStock: p.currentStock,
        quantityOnHand: p.currentStock,
        minimumStock: p.minimumStock,
        shortageQuantity: Math.max(0, p.minimumStock - p.currentStock),
        shelfLocation: p.shelfLocation || 'Chưa xếp kệ',
        supplierInfo: p.supplierInfo,
        severity: p.currentStock === 0 ? 'CRITICAL_OUT_OF_STOCK' : 'WARNING_LOW_STOCK',
      })),
    };
  }

  /**
   * 7. THỐNG KÊ TỔNG QUAN KHO VẬT TƯ & TỔNG GIÁ TRỊ TỒN KHO
   */
  async getInventoryOverview() {
    const allParts = await this.partRepo.find({ where: { isActive: true } });

    let totalQuantityOnHand = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    allParts.forEach((p) => {
      const stock = Number(p.currentStock || 0);
      const price = Number(p.unitPrice || 0);

      totalQuantityOnHand += stock;
      totalInventoryValue += stock * price;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= p.minimumStock) {
        lowStockCount++;
      }
    });

    return {
      success: true,
      overview: {
        totalPartTypes: allParts.length,
        totalQuantityOnHand,
        totalInventoryValueVNĐ: totalInventoryValue,
        inStockCount: allParts.length - lowStockCount - outOfStockCount,
        lowStockCount,
        outOfStockCount,
        needsReorder: lowStockCount + outOfStockCount > 0,
      },
    };
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
    if (dto.workOrderId) {
      throw new BadRequestException('Use the material-request approval API to issue parts for a Work Order');
    }
    if (!Number.isInteger(dto.quantity) || dto.quantity < 1 || dto.quantity > 1000000) {
      throw new BadRequestException('Quantity must be an integer between 1 and 1000000');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const part = await queryRunner.manager.findOne(Part, {
        where: { id: partId, isActive: true },
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
        stockAfter = dto.quantity;
      }

      part.currentStock = stockAfter;
      await queryRunner.manager.save(part);

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

  // ================= XUẤT PHỤ TÙNG SỬA CHỮA CHO TÀI SẢN (GIAO DỊCH ACID) =================
  async issuePartToAsset(dto: IssuePartToAssetDto) {
    if (dto.workOrderId) {
      throw new BadRequestException('Use the material-request approval API to issue parts for a Work Order');
    }
    if (!Number.isInteger(dto.quantity) || dto.quantity < 1 || dto.quantity > 1000000) {
      throw new BadRequestException('Quantity must be an integer between 1 and 1000000');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const part = await queryRunner.manager.findOne(Part, {
        where: { id: dto.partId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!part) {
        throw new NotFoundException(`Không tìm thấy phụ tùng với ID: ${dto.partId}`);
      }

      const stockBefore = part.currentStock;
      if (stockBefore < dto.quantity) {
        throw new BadRequestException(
          `Không đủ số lượng phụ tùng trong kho để xuất! Phụ tùng '${part.name}' (Mã: ${part.partCode}) hiện chỉ còn tồn ${stockBefore} ${part.unit}, yêu cầu xuất ${dto.quantity} ${part.unit}.`,
        );
      }

      const asset = await queryRunner.manager.findOne(Asset, {
        where: { id: dto.assetId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!asset) {
        throw new NotFoundException(`Không tìm thấy tài sản / thiết bị với ID: ${dto.assetId}`);
      }

      const blockingWork = await queryRunner.manager.getRepository(WorkOrder).createQueryBuilder('wo')
        .where('wo.assetId = :assetId', { assetId: asset.id })
        .andWhere("wo.status NOT IN ('CLOSED', 'CANCELLED')").getExists();
      if (blockingWork) throw new ConflictException('Use the material request workflow while this asset has an open Work Order');

      const stockAfter = stockBefore - dto.quantity;
      part.currentStock = stockAfter;
      await queryRunner.manager.save(part);

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

      if (asset.status !== AssetStatus.OPERATIONAL) {
        asset.status = AssetStatus.OPERATIONAL;
        await queryRunner.manager.save(asset);
      }

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
          quantityOnHand: stockAfter,
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
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactions(partId: string): Promise<PartTransaction[]> {
    return this.txRepo.createQueryBuilder('tx')
      .leftJoin('tx.performedBy', 'actor')
      .addSelect(['actor.id', 'actor.username', 'actor.fullName'])
      .where('tx.partId = :partId', { partId })
      .orderBy('tx.createdAt', 'DESC').getMany();
  }
}
