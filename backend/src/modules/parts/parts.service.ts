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
import {
  AdjustStockDto,
  CreateAssetPartBomDto,
  CreatePartDto,
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

  async getTransactions(partId: string): Promise<PartTransaction[]> {
    return this.txRepo.find({
      where: { partId },
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
