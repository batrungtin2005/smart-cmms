import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset, AssetStatus, AssetCriticality } from './entities/asset.entity';
import { AssetHistory } from '../history/entities/asset-history.entity';
import { RedisService } from '../../common/redis/redis.service';
import {
  CreateAssetDto,
  QueryAssetDto,
  UpdateAssetDto,
  UpdateAssetStatusDto,
} from './dto/create-asset.dto';
import { QrCodeUtil, QrLabelPayload } from '../../common/utils/qr-code.util';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
    private readonly redisService: RedisService,
  ) {}

  // 1. LẤY DANH SÁCH TÀI SẢN (Hỗ trợ phân trang, tìm kiếm mã/tên/model/seri, lọc trạng thái, lọc xưởng kèm Redis Cache)
  async findAll(query: QueryAssetDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1.1. Tạo key định danh cache theo toàn bộ bộ lọc
    const cacheKey = `assets:list:${page}:${limit}:${query.search || ''}:${query.status || ''}:${query.locationId || ''}:${query.category || ''}:${query.model || ''}:${query.criticality || ''}`;

    // 1.2. Thử lấy dữ liệu từ Redis Cache trước
    const cachedData = await this.redisService.get<any>(cacheKey);
    if (cachedData) {
      return {
        ...cachedData,
        meta: {
          ...cachedData.meta,
          fromCache: true,
        },
      };
    }

    // 1.3. Nếu Cache Miss (chưa có trong cache) -> Truy vấn PostgreSQL
    const queryBuilder = this.assetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.location', 'location')
      .where('asset.isActive = :isActive', { isActive: true });

    // Tìm kiếm đa năng: Mã AST-xxx, Tên máy, Model, Hãng SX, Số seri
    if (query.search) {
      queryBuilder.andWhere(
        '(asset.assetCode ILIKE :search OR asset.name ILIKE :search OR asset.model ILIKE :search OR asset.manufacturer ILIKE :search OR asset.serialNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Lọc theo Model
    if (query.model) {
      queryBuilder.andWhere('asset.model ILIKE :model', {
        model: `%${query.model}%`,
      });
    }

    // Lọc theo Trạng thái vận hành (OPERATIONAL, DOWN, MAINTENANCE, DECOMMISSIONED)
    if (query.status) {
      queryBuilder.andWhere('asset.status = :status', { status: query.status });
    }

    // Lọc theo Mức độ quan trọng (LOW, MEDIUM, HIGH, CRITICAL)
    if (query.criticality) {
      queryBuilder.andWhere('asset.criticality = :criticality', {
        criticality: query.criticality,
      });
    }

    // Lọc theo Vị trí nhà xưởng
    if (query.locationId) {
      queryBuilder.andWhere('asset.locationId = :locationId', {
        locationId: query.locationId,
      });
    }

    // Lọc theo Nhóm thiết bị (Cơ khí, Thủy lực, Điện tự động...)
    if (query.category) {
      queryBuilder.andWhere('asset.category ILIKE :category', {
        category: `%${query.category}%`,
      });
    }

    queryBuilder
      .orderBy('asset.assetCode', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const responsePayload = {
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        fromCache: false,
      },
    };

    // 1.4. Lưu vào Redis Cache với thời gian sống (TTL) 120 giây (2 phút)
    await this.redisService.set(cacheKey, responsePayload, 120);

    return responsePayload;
  }

  // 2. XEM CHI TIẾT MỘT TÀI SẢN (Kèm vị trí và định mức phụ tùng BOM)
  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id, isActive: true },
      relations: [
        'location',
        'location.parent',
        'bomParts',
        'bomParts.part',
      ],
    });

    if (!asset) {
      throw new NotFoundException(`Không tìm thấy thiết bị có ID: ${id}`);
    }

    return asset;
  }

  // 3. TRA CỨU THEO MÃ QR CODE / MÃ ASSET CODE (Phục vụ Mobile Flutter quét hiện trường)
  async findByCode(assetCode: string): Promise<Asset> {
    const cleanCode = assetCode.trim().toUpperCase();
    const asset = await this.assetRepo.findOne({
      where: { assetCode: cleanCode, isActive: true },
      relations: ['location', 'location.parent', 'bomParts', 'bomParts.part'],
    });

    if (!asset) {
      throw new NotFoundException(
        `Không tìm thấy thiết bị có mã định danh / QR: ${assetCode}`,
      );
    }

    return asset;
  }

  // 4. THÊM TÀI SẢN MỚI (Tự động sinh mã QR URL & kiểm tra trùng mã)
  async create(dto: CreateAssetDto): Promise<Asset> {
    const assetCode = dto.assetCode.trim().toUpperCase();
    const existing = await this.assetRepo.findOne({
      where: { assetCode },
    });

    if (existing) {
      throw new ConflictException(`Mã tài sản '${assetCode}' đã tồn tại trên hệ thống!`);
    }

    // URL định danh chuẩn cho Mobile Scanner
    const qrCodeUrl = `https://cmms.local/assets/code/${assetCode}`;

    const newAsset = this.assetRepo.create({
      ...dto,
      assetCode,
      qrCodeUrl,
      status: dto.status || AssetStatus.OPERATIONAL,
      operatingHours: dto.operatingHours || 0,
      totalFailures: 0,
      totalRepairTimeHours: 0,
      cachedMttrHours: 0,
      cachedMtbfHours: 0,
    });

    const saved = await this.assetRepo.save(newAsset);
    // Invalidate cache danh sách tài sản khi có máy mới được thêm
    await this.redisService.delByPattern('assets:*');
    return saved;
  }

  // 5. CẬP NHẬT TRẠNG THÁI TÀI SẢN (OPERATIONAL, DOWN, MAINTENANCE, DECOMMISSIONED)
  private async checkOperational(manager: EntityManager, assetId: string, status?: AssetStatus) {
    if (status !== AssetStatus.OPERATIONAL) return;
    const blocking = await manager.getRepository(WorkOrder).createQueryBuilder('wo')
      .where('wo.assetId = :assetId', { assetId })
      .andWhere("(wo.status IN ('IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'REWORK_REQUIRED') OR (wo.status IN ('OPEN', 'ASSIGNED') AND wo.type IN ('CORRECTIVE', 'EMERGENCY')))")
      .getExists();
    if (blocking) throw new ConflictException('Cannot restore operation while maintenance work orders are unresolved');
  }

  async updateStatus(id: string, dto: UpdateAssetStatusDto): Promise<Asset> {
    const saved = await this.assetRepo.manager.transaction(async manager => {
      const asset = await manager.findOne(Asset, { where: { id, isActive: true }, lock: { mode: 'pessimistic_write' } });
      if (!asset) throw new NotFoundException('Asset not found');
      await this.checkOperational(manager, id, dto.status);
      await manager.update(Asset, id, {
        status: dto.status,
        ...(dto.status === AssetStatus.DOWN && asset.status !== AssetStatus.DOWN ? { lastFailureDate: new Date() } : {}),
      });
      return manager.findOneByOrFail(Asset, { id });
    });
    await this.redisService.delByPattern('assets:*');
    return saved;
  }

  // 6. CẬP NHẬT THÔNG TIN THIẾT BỊ
  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const saved = await this.assetRepo.manager.transaction(async manager => {
      const asset = await manager.findOne(Asset, { where: { id, isActive: true }, lock: { mode: 'pessimistic_write' } });
      if (!asset) throw new NotFoundException('Asset not found');
      await this.checkOperational(manager, id, dto.status);
      if (Object.keys(dto).length) await manager.update(Asset, id, dto);
      return manager.findOneByOrFail(Asset, { id });
    });
    await this.redisService.delByPattern('assets:*');
    return saved;
  }

  // 7. VÔ HIỆU HÓA TÀI SẢN (SOFT DELETE)
  async remove(id: string) {
    const asset = await this.findOne(id);
    await this.assetRepo.update(id, { isActive: false });
    await this.redisService.delByPattern('assets:*');
    return {
      success: true,
      message: `Đã vô hiệu hóa thành công tài sản ${asset.assetCode} - ${asset.name}`,
    };
  }

  // 8. XEM LỊCH SỬ BẢO TRÌ CỦA MỘT TÀI SẢN CỤ THỂ (KÈM REDIS CACHE)
  async getMaintenanceHistory(assetId: string) {
    const cacheKey = `assets:history:${assetId}`;
    const cachedHistory = await this.redisService.get<any>(cacheKey);
    if (cachedHistory) {
      return {
        ...cachedHistory,
        fromCache: true,
      };
    }

    await this.findOne(assetId);

    const history = await this.historyRepo.find({
      where: { assetId },
      relations: ['performedBy', 'workOrder'],
      order: { createdAt: 'DESC' },
    });

    const failureLogs = history.filter((h) => h.isFailureCounted);
    const totalRepairHours = failureLogs.reduce(
      (sum, h) => sum + Number(h.actualRepairTimeHours || 0),
      0,
    );
    const totalDowntimeHours = failureLogs.reduce(
      (sum, h) => sum + Number(h.downtimeHours || 0),
      0,
    );

    const failuresCount = failureLogs.length;
    const mttr = failuresCount > 0 ? Number((totalRepairHours / failuresCount).toFixed(2)) : 0;

    const result = {
      success: true,
      assetId,
      totalEvents: history.length,
      metricsSummary: {
        totalFailures: failuresCount,
        totalDowntimeHours: Number(totalDowntimeHours.toFixed(2)),
        totalRepairHours: Number(totalRepairHours.toFixed(2)),
        mttrHours: mttr,
      },
      historyTimeline: history,
      fromCache: false,
    };

    await this.redisService.set(cacheKey, result, 180);
    return result;
  }

  // 9. QUÉT MÃ QR TRA CỨU CHI TIẾT & ĐÁNH GIÁ ĐỊNH MỨC PHỤ TÙNG BOM
  async scanQrAndGetInspectionDetails(identifier: string) {
    let asset: Asset | null = null;
    const cleanInput = identifier.trim();

    // Thử tìm theo ID (nếu là UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanInput);
    if (isUUID) {
      asset = await this.assetRepo.findOne({
        where: { id: cleanInput, isActive: true },
        relations: ['location', 'location.parent', 'bomParts', 'bomParts.part'],
      });
    }

    // Nếu chưa thấy, tìm theo Asset Code
    if (!asset) {
      asset = await this.assetRepo.findOne({
        where: { assetCode: cleanInput.toUpperCase(), isActive: true },
        relations: ['location', 'location.parent', 'bomParts', 'bomParts.part'],
      });
    }

    if (!asset) {
      throw new NotFoundException(`Không tìm thấy thiết bị từ mã quét QR: ${identifier}`);
    }

    const history = await this.historyRepo.find({
      where: { assetId: asset.id },
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });

    const currentOperatingHours = Number(asset.operatingHours || 0);

    const periodicReplacementParts = (asset.bomParts || []).map((bom) => {
      const part = bom.part;
      const intervalHours = bom.replacementIntervalHours ? Number(bom.replacementIntervalHours) : null;
      const intervalDays = bom.replacementIntervalDays ? Number(bom.replacementIntervalDays) : null;

      let lastReplacedOperatingHours = 0;
      let lastReplacedDate: Date | null = null;

      for (const log of history) {
        if (log.partsReplaced && Array.isArray(log.partsReplaced)) {
          const foundPart = log.partsReplaced.find(
            (p: any) => p.partId === bom.partId || p.partCode === part.partCode,
          );
          if (foundPart) {
            lastReplacedOperatingHours = Number(log.operatingHoursAtFailure || 0);
            lastReplacedDate = log.repairEndTime || log.createdAt;
            break;
          }
        }
      }

      let hoursSinceLastReplacement = currentOperatingHours - lastReplacedOperatingHours;
      if (hoursSinceLastReplacement < 0) hoursSinceLastReplacement = 0;

      let remainingHours: number | null = null;
      let maintenanceStatus: 'OVERDUE' | 'DUE_SOON' | 'GOOD' | 'NO_INTERVAL' = 'NO_INTERVAL';

      if (intervalHours && intervalHours > 0) {
        remainingHours = Number((intervalHours - hoursSinceLastReplacement).toFixed(2));
        if (remainingHours <= 0) {
          maintenanceStatus = 'OVERDUE';
        } else if (remainingHours <= 50) {
          maintenanceStatus = 'DUE_SOON';
        } else {
          maintenanceStatus = 'GOOD';
        }
      }

      const inStock = Number(part.currentStock || 0);
      const standardQty = Number(bom.standardQuantity || 1);
      let stockStatus: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'AVAILABLE';

      if (inStock === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (inStock < standardQty) {
        stockStatus = 'LOW_STOCK';
      }

      return {
        partId: part.id,
        partCode: part.partCode,
        partName: part.name,
        category: part.category,
        unit: part.unit,
        unitPrice: Number(part.unitPrice),
        standardQuantity: standardQty,
        installationPosition: bom.installationPosition || 'Trục truyền động',
        isCritical: bom.isCritical,
        replacementIntervalHours: intervalHours,
        replacementIntervalDays: intervalDays,
        lastReplacedDate,
        lastReplacedOperatingHours,
        hoursSinceLastReplacement: Number(hoursSinceLastReplacement.toFixed(2)),
        remainingHoursUntilReplacement: remainingHours,
        maintenanceStatus,
        currentStock: inStock,
        shelfLocation: part.shelfLocation || 'Chưa xếp kệ',
        stockStatus,
      };
    });

    const failureLogs = history.filter((h) => h.isFailureCounted);
    const totalRepairHours = failureLogs.reduce(
      (sum, h) => sum + Number(h.actualRepairTimeHours || 0),
      0,
    );
    const failureCount = failureLogs.length;
    const mttrHours = failureCount > 0 ? Number((totalRepairHours / failureCount).toFixed(2)) : 0;
    const mtbfHours = failureCount > 0 ? Number((currentOperatingHours / failureCount).toFixed(2)) : currentOperatingHours;

    const overduePartsCount = periodicReplacementParts.filter((p) => p.maintenanceStatus === 'OVERDUE').length;
    const dueSoonPartsCount = periodicReplacementParts.filter((p) => p.maintenanceStatus === 'DUE_SOON').length;

    return {
      success: true,
      message: 'Tra cứu thông tin quét mã QR thành công',
      scannedIdentifier: identifier,
      asset: {
        id: asset.id,
        assetCode: asset.assetCode,
        name: asset.name,
        category: asset.category,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serialNumber: asset.serialNumber,
        status: asset.status,
        criticality: asset.criticality,
        installDate: asset.installDate,
        operatingHours: currentOperatingHours,
        qrCodeUrl: asset.qrCodeUrl,
        location: asset.location
          ? {
              id: asset.location.id,
              code: asset.location.code,
              name: asset.location.name,
              factoryArea: asset.location.parent ? asset.location.parent.name : null,
            }
          : null,
        specifications: asset.specifications || {},
      },
      maintenanceOverview: {
        totalFailures: failureCount,
        mttrHours,
        mtbfHours,
        overduePartsCount,
        dueSoonPartsCount,
        hasUrgentMaintenance: overduePartsCount > 0 || asset.status === AssetStatus.DOWN,
      },
      periodicReplacementParts,
      recentMaintenanceHistory: history.slice(0, 5),
    };
  }

  // ================= TÍCH HỢP THƯ VIỆN SINH MÃ QR DUY NHẤT =================

  /**
   * 10. SINH VÀ LẤY DỮ LIỆU MÃ QR KÈM TEM NHÃN IN ẤN
   */
  async getQrCodeData(idOrCode: string) {
    let asset: Asset | null = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrCode);

    if (isUUID) {
      asset = await this.findOne(idOrCode);
    } else {
      asset = await this.findByCode(idOrCode);
    }

    const qrPayload = QrCodeUtil.formatAssetQrPayload(asset);
    const qrDataUrl = await QrCodeUtil.toDataURL(qrPayload);

    return {
      success: true,
      assetId: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      model: asset.model || 'N/A',
      serialNumber: asset.serialNumber || 'N/A',
      category: asset.category,
      locationName: asset.location ? asset.location.name : 'Chưa phân xưởng',
      qrDataUrl, // Chuỗi base64 PNG để thẻ <img src={qrDataUrl} /> hiển thị ngay
      qrRawContent: qrPayload,
      printLabel: {
        company: 'ZENTECH SMART CMMS',
        title: 'TEM ĐỊNH DANH THIẾT BỊ',
        assetCode: asset.assetCode,
        name: asset.name,
        model: asset.model || 'N/A',
        serialNumber: asset.serialNumber || 'N/A',
        location: asset.location ? asset.location.name : 'Chưa phân bổ',
        installDate: asset.installDate ? asset.installDate.toString() : 'N/A',
        operatingHours: `${Number(asset.operatingHours || 0).toLocaleString()} h`,
        status: asset.status,
      },
    };
  }

  /**
   * 11. SINH BUFFER ẢNH PNG PHỤC VỤ STREAM TẢI FILE TRỰC TIẾP
   */
  async getQrBuffer(idOrCode: string): Promise<{ buffer: Buffer; assetCode: string }> {
    let asset: Asset | null = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrCode);

    if (isUUID) {
      asset = await this.findOne(idOrCode);
    } else {
      asset = await this.findByCode(idOrCode);
    }

    const qrPayload = QrCodeUtil.formatAssetQrPayload(asset);
    const buffer = await QrCodeUtil.toBuffer(qrPayload);

    return { buffer, assetCode: asset.assetCode };
  }

  /**
   * 12. THỐNG KÊ TỔNG QUAN TÀI SẢN CHO DASHBOARD
   */
  async getOverview() {
    const assets = await this.assetRepo.find({
      where: { isActive: true },
      relations: ['location'],
    });

    const total = assets.length;
    let operational = 0;
    let down = 0;
    let maintenance = 0;
    let decommissioned = 0;

    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    let sumOperatingHours = 0;
    let sumMttr = 0;
    let sumMtbf = 0;
    let mttrCount = 0;
    let mtbfCount = 0;

    assets.forEach((a) => {
      // Trạng thái
      if (a.status === AssetStatus.OPERATIONAL) operational++;
      else if (a.status === AssetStatus.DOWN) down++;
      else if (a.status === AssetStatus.MAINTENANCE) maintenance++;
      else if (a.status === AssetStatus.DECOMMISSIONED) decommissioned++;

      // Độ quan trọng
      if (a.criticality === AssetCriticality.CRITICAL) critical++;
      else if (a.criticality === AssetCriticality.HIGH) high++;
      else if (a.criticality === AssetCriticality.MEDIUM) medium++;
      else if (a.criticality === AssetCriticality.LOW) low++;

      sumOperatingHours += Number(a.operatingHours || 0);

      const mttr = Number(a.cachedMttrHours || 0);
      if (mttr > 0) {
        sumMttr += mttr;
        mttrCount++;
      }

      const mtbf = Number(a.cachedMtbfHours || 0);
      if (mtbf > 0) {
        sumMtbf += mtbf;
        mtbfCount++;
      }
    });

    return {
      success: true,
      totalAssets: total,
      statusBreakdown: {
        OPERATIONAL: operational,
        DOWN: down,
        MAINTENANCE: maintenance,
        DECOMMISSIONED: decommissioned,
      },
      criticalityBreakdown: {
        CRITICAL: critical,
        HIGH: high,
        MEDIUM: medium,
        LOW: low,
      },
      metrics: {
        totalOperatingHours: Number(sumOperatingHours.toFixed(2)),
        avgMttrHours: mttrCount > 0 ? Number((sumMttr / mttrCount).toFixed(2)) : 0,
        avgMtbfHours: mtbfCount > 0 ? Number((sumMtbf / mtbfCount).toFixed(2)) : 0,
      },
    };
  }
}
