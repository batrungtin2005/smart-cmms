import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Part, PartStatus } from '../entities/part.entity';
import {
  PartTransaction,
  TransactionType,
} from '../entities/part-transaction.entity';
import { ImportPartStockDto } from './dto/import-part-stock.dto';
import { ExportPartStockDto } from './dto/export-part-stock.dto';
import { QueryPartTransactionDto } from './dto/query-part-transaction.dto';

@Injectable()
export class PartTransactionsService {
  constructor(
    @InjectRepository(PartTransaction)
    private readonly txRepo: Repository<PartTransaction>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. GHI KHO ĐẦU VÀO (NHẬP KHO VẬT TƯ / PHỤ TÙNG)
   * Sử dụng Pessimistic Locking để đảm bảo tính toàn vẹn dữ liệu khi nhiều tiến trình nhập cùng lúc.
   */
  async importStock(dto: ImportPartStockDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Khóa bi quan dòng phụ tùng (Pessimistic Write Lock)
      const part = await queryRunner.manager.findOne(Part, {
        where: { id: dto.partId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!part) {
        throw new NotFoundException(
          `Không tìm thấy phụ tùng còn hoạt động với ID: ${dto.partId}`,
        );
      }

      const stockBefore = Number(part.currentStock || 0);
      const stockAfter = stockBefore + dto.quantity;

      // Cập nhật số lượng tồn kho
      part.currentStock = stockAfter;

      // Cập nhật giá vốn nhập gần nhất nếu có truyền vào
      if (dto.unitPrice !== undefined && dto.unitPrice !== null) {
        part.unitPrice = dto.unitPrice;
      }

      // Cập nhật thông tin nhà cung cấp nếu có
      if (dto.supplierInfo) {
        part.supplierInfo = dto.supplierInfo;
      }

      await queryRunner.manager.save(part);

      // Tạo mã chứng từ tham chiếu mặc định nếu chưa có
      const referenceCode =
        dto.referenceCode || `PNK-${Date.now().toString().slice(-8)}`;

      const transaction = queryRunner.manager.create(PartTransaction, {
        partId: part.id,
        workOrderId: null,
        transactionType: TransactionType.IMPORT,
        quantity: dto.quantity,
        stockBefore,
        stockAfter,
        unitPrice:
          dto.unitPrice !== undefined ? dto.unitPrice : Number(part.unitPrice),
        referenceCode,
        performedById: dto.performedById || null,
        notes:
          dto.notes ||
          `Nhập kho ${dto.quantity} ${part.unit} (Trước: ${stockBefore}, Sau: ${stockAfter})${
            dto.supplierInfo ? ' từ ' + dto.supplierInfo : ''
          }`,
      });

      const savedTx = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Ghi nhận nhập kho thành công cho phụ tùng ${part.partCode} - ${part.name}`,
        transaction: savedTx,
        part: {
          id: part.id,
          partCode: part.partCode,
          name: part.name,
          category: part.category,
          unit: part.unit,
          unitPrice: Number(part.unitPrice),
          stockBefore,
          stockAfter,
          quantityOnHand: stockAfter,
          minimumStock: part.minimumStock,
          isLowStock: stockAfter <= part.minimumStock,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 2. XUẤT KHO CHO LỆNH SẢN XUẤT / LỆNH BẢO TRÌ (WORK ORDER)
   * Kiểm soát chặt chẽ KHÔNG CHO PHÉP TỒN KHO ÂM bằng Khóa giao dịch (Pessimistic Write Lock).
   */
  async exportStockForProduction(dto: ExportPartStockDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Khóa bi quan dòng phụ tùng (Pessimistic Write Lock) ngăn race-condition khi đồng thời xuất kho
      const part = await queryRunner.manager.findOne(Part, {
        where: { id: dto.partId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!part) {
        throw new NotFoundException(
          `Không tìm thấy phụ tùng còn hoạt động với ID: ${dto.partId}`,
        );
      }

      const stockBefore = Number(part.currentStock || 0);

      // ===== KIỂM SOÁT TỒN KHO KHÔNG CHO PHÉP ÂM (KHÓA GIAO DỊCH) =====
      if (stockBefore < dto.quantity) {
        throw new BadRequestException(
          `Không đủ tồn kho để xuất! Phụ tùng '${part.name}' (Mã: ${part.partCode}) hiện chỉ còn tồn ${stockBefore} ${part.unit}, yêu cầu xuất ${dto.quantity} ${part.unit}. Giao dịch bị khóa và hủy bỏ nhằm kiểm soát không cho phép tồn kho âm.`,
        );
      }

      const stockAfter = stockBefore - dto.quantity;
      part.currentStock = stockAfter;
      await queryRunner.manager.save(part);

      // Xác định mã tham chiếu: Lệnh sản xuất, Phiếu xuất kho hoặc Work Order
      const referenceCode =
        dto.productionOrderCode ||
        dto.referenceCode ||
        (dto.workOrderId
          ? `WO-${dto.workOrderId.substring(0, 8).toUpperCase()}`
          : `PXK-${Date.now().toString().slice(-8)}`);

      const reasonText =
        dto.reason ||
        (dto.productionOrderCode
          ? `Xuất phục vụ Lệnh sản xuất ${dto.productionOrderCode}`
          : 'Xuất kho phục vụ sửa chữa / bảo trì');

      const transaction = queryRunner.manager.create(PartTransaction, {
        partId: part.id,
        workOrderId: dto.workOrderId || null,
        transactionType: TransactionType.EXPORT,
        quantity: dto.quantity,
        stockBefore,
        stockAfter,
        unitPrice: Number(part.unitPrice),
        referenceCode,
        performedById: dto.performedById || null,
        notes: dto.notes ? `${reasonText} - Ghi chú: ${dto.notes}` : reasonText,
      });

      const savedTx = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Xuất kho thành công ${dto.quantity} ${part.unit} cho phụ tùng ${part.partCode} - ${part.name}`,
        transaction: savedTx,
        part: {
          id: part.id,
          partCode: part.partCode,
          name: part.name,
          unit: part.unit,
          stockBefore,
          stockAfter,
          quantityOnHand: stockAfter,
          minimumStock: part.minimumStock,
          isLowStock: stockAfter <= part.minimumStock,
          isOutOfStock: stockAfter === 0,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 3. TRUY VẤN LỊCH SỬ GIAO DỊCH KHO (PHÂN TRANG & BỘ LỌC)
   */
  async findAll(query?: QueryPartTransactionDto) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.part', 'part')
      .leftJoinAndSelect('tx.performedBy', 'performedBy');

    // Lọc theo phụ tùng
    if (query?.partId) {
      qb.andWhere('tx.partId = :partId', { partId: query.partId });
    }

    // Lọc theo Lệnh sản xuất / Work Order
    if (query?.workOrderId) {
      qb.andWhere('tx.workOrderId = :workOrderId', {
        workOrderId: query.workOrderId,
      });
    }

    // Lọc theo loại giao dịch (IMPORT / EXPORT / ADJUSTMENT)
    if (query?.transactionType) {
      qb.andWhere('tx.transactionType = :txType', {
        txType: query.transactionType,
      });
    }

    // Tìm kiếm tự do theo mã chứng từ hoặc ghi chú
    if (query?.search) {
      qb.andWhere(
        '(tx.referenceCode ILIKE :search OR tx.notes ILIKE :search OR part.partCode ILIKE :search OR part.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Lọc theo khoảng thời gian
    if (query?.startDate) {
      qb.andWhere('tx.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }
    if (query?.endDate) {
      qb.andWhere('tx.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    qb.orderBy('tx.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 4. LẤY DANH SÁCH PHỤ TÙNG ĐÃ XUẤT CHO 1 LỆNH SẢN XUẤT / WORK ORDER
   */
  async findByWorkOrder(workOrderId: string) {
    const transactions = await this.txRepo.find({
      where: { workOrderId, transactionType: TransactionType.EXPORT },
      relations: ['part', 'performedBy'],
      order: { createdAt: 'DESC' },
    });

    const totalCost = transactions.reduce(
      (sum, tx) => sum + Number(tx.unitPrice || 0) * Number(tx.quantity || 0),
      0,
    );

    return {
      success: true,
      workOrderId,
      totalCostParts: totalCost,
      count: transactions.length,
      items: transactions.map((tx) => ({
        transactionId: tx.id,
        partId: tx.partId,
        partCode: tx.part?.partCode,
        partName: tx.part?.name,
        quantity: tx.quantity,
        unit: tx.part?.unit,
        unitPrice: Number(tx.unitPrice),
        totalPrice: Number(tx.unitPrice) * Number(tx.quantity),
        referenceCode: tx.referenceCode,
        performedBy: tx.performedBy?.fullName || null,
        createdAt: tx.createdAt,
        notes: tx.notes,
      })),
    };
  }

  /**
   * 5. XEM CHI TIẾT MỘT BẢN GHI GIAO DỊCH
   */
  async findOne(id: string) {
    const tx = await this.txRepo.findOne({
      where: { id },
      relations: ['part', 'performedBy'],
    });

    if (!tx) {
      throw new NotFoundException(`Không tìm thấy giao dịch kho với ID: ${id}`);
    }

    return {
      success: true,
      data: tx,
    };
  }
}

