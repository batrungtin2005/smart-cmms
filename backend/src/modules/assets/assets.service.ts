import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, AssetStatus } from './entities/asset.entity';
import { AssetHistory } from '../history/entities/asset-history.entity';
import {
  CreateAssetDto,
  QueryAssetDto,
  UpdateAssetDto,
  UpdateAssetStatusDto,
} from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
  ) {}

  // 1. LẤY DANH SÁCH TÀI SẢN (Hỗ trợ phân trang, tìm kiếm mã/tên, lọc trạng thái, lọc xưởng)
  async findAll(query: QueryAssetDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.assetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.location', 'location')
      .where('asset.isActive = :isActive', { isActive: true });

    if (query.search) {
      queryBuilder.andWhere(
        '(asset.assetCode ILIKE :search OR asset.name ILIKE :search OR asset.serialNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('asset.status = :status', { status: query.status });
    }

    if (query.locationId) {
      queryBuilder.andWhere('asset.locationId = :locationId', {
        locationId: query.locationId,
      });
    }

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

  // 2. XEM CHI TIẾT MỘT TÀI SẢN (Kèm vị trí và định mức phụ tùng BOM)
  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id, isActive: true },
      relations: [
        'location',
        'bomParts',
        'bomParts.part',
      ],
    });

    if (!asset) {
      throw new NotFoundException(`Không tìm thấy thiết bị có ID: ${id}`);
    }

    return asset;
  }

  // 3. TRA CỨU THEO MÃ QR CODE (Dành riêng cho Mobile Flutter khi quét mã hiện trường)
  async findByCode(assetCode: string): Promise<Asset> {
    const cleanCode = assetCode.trim().toUpperCase();
    const asset = await this.assetRepo.findOne({
      where: { assetCode: cleanCode, isActive: true },
      relations: ['location', 'bomParts', 'bomParts.part'],
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

    // Tự sinh URL QR code định danh chuẩn cho Mobile Scanner
    const qrCodeUrl = `cmms://assets/code/${assetCode}`;

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

    return this.assetRepo.save(newAsset);
  }

  // 5. CẬP NHẬT TRẠNG THÁI TÀI SẢN (OPERATIONAL, DOWN, MAINTENANCE, DECOMMISSIONED)
  async updateStatus(id: string, dto: UpdateAssetStatusDto): Promise<Asset> {
    const asset = await this.findOne(id);
    const oldStatus = asset.status;
    asset.status = dto.status;

    // Nếu chuyển sang trạng thái DOWN (hỏng hóc dừng máy), ghi nhận thời điểm sự cố
    if (dto.status === AssetStatus.DOWN && oldStatus !== AssetStatus.DOWN) {
      asset.lastFailureDate = new Date();
    }

    return this.assetRepo.save(asset);
  }

  // 6. CẬP NHẬT THÔNG TIN TÀI SẢN
  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);
    Object.assign(asset, dto);
    return this.assetRepo.save(asset);
  }

  // 7. XÓA TÀI SẢN (Xóa mềm - Soft delete)
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const asset = await this.findOne(id);
    asset.isActive = false;
    await this.assetRepo.save(asset);
    return {
      success: true,
      message: `Đã vô hiệu hóa thành công tài sản ${asset.assetCode} - ${asset.name}`,
    };
  }

  // 8. XEM LỊCH SỬ BẢO TRÌ CỦA MỘT TÀI SẢN CỤ THỂ
  async getMaintenanceHistory(assetId: string) {
    // Kiểm tra tài sản có tồn tại không
    await this.findOne(assetId);

    const history = await this.historyRepo.find({
      where: { assetId },
      relations: ['performedBy', 'workOrder'],
      order: { createdAt: 'DESC' },
    });

    // Thống kê sơ bộ các chỉ số của máy
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

    return {
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
    };
  }

  // 9. QUÉT MÃ QR HOẶC NHẬP ASSET ID: XEM CHI TIẾT THIẾT BỊ KÈM DANH SÁCH PHỤ TÙNG CẦN THAY ĐỊNH KỲ
  async scanQrAndGetInspectionDetails(identifier: string) {
    if (!identifier || identifier.trim() === '') {
      throw new NotFoundException('Mã QR hoặc ID thiết bị không được để trống!');
    }

    // Chuẩn hóa identifier (Bóc tách mã nếu là URL hoặc Schema QR Code)
    let parsedCode = identifier.trim();
    if (parsedCode.includes('cmms://assets/code/')) {
      parsedCode = parsedCode.replace('cmms://assets/code/', '').trim();
    } else if (parsedCode.includes('/code/')) {
      parsedCode = parsedCode.substring(parsedCode.lastIndexOf('/code/') + 6).trim();
    } else if (parsedCode.includes('/assets/')) {
      parsedCode = parsedCode.substring(parsedCode.lastIndexOf('/assets/') + 8).trim();
    }

    // Nhận diện định dạng UUID hay Asset Code (AST-xxx / COMP-xxx)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsedCode);

    const asset = await this.assetRepo.findOne({
      where: isUuid
        ? { id: parsedCode, isActive: true }
        : { assetCode: parsedCode.toUpperCase(), isActive: true },
      relations: [
        'location',
        'location.parent',
        'bomParts',
        'bomParts.part',
      ],
    });

    if (!asset) {
      throw new NotFoundException(
        `Không tìm thấy thiết bị tương ứng với mã quét QR: '${identifier}'`,
      );
    }

    // Lấy toàn bộ lịch sử sửa chữa/bảo trì của máy
    const history = await this.historyRepo.find({
      where: { assetId: asset.id },
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });

    // Phân tích danh sách phụ tùng định mức cần thay thế định kỳ
    const currentOperatingHours = Number(asset.operatingHours || 0);

    const periodicReplacementParts = (asset.bomParts || []).map((bom) => {
      const part = bom.part;
      const intervalHours = bom.replacementIntervalHours ? Number(bom.replacementIntervalHours) : null;
      const intervalDays = bom.replacementIntervalDays ? Number(bom.replacementIntervalDays) : null;

      // Tìm trong lịch sử xem phụ tùng này được thay thế gần nhất khi nào
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

      // Tính toán chu kỳ thay thế
      let hoursSinceLastReplacement = currentOperatingHours - lastReplacedOperatingHours;
      if (hoursSinceLastReplacement < 0) hoursSinceLastReplacement = 0;

      let remainingHours: number | null = null;
      let maintenanceStatus: 'OVERDUE' | 'DUE_SOON' | 'GOOD' | 'NO_INTERVAL' = 'NO_INTERVAL';

      if (intervalHours && intervalHours > 0) {
        remainingHours = Number((intervalHours - hoursSinceLastReplacement).toFixed(2));
        if (remainingHours <= 0) {
          maintenanceStatus = 'OVERDUE'; // Đã quá hạn thay thế định kỳ!
        } else if (remainingHours <= 50) {
          maintenanceStatus = 'DUE_SOON'; // Sắp đến hạn thay trong vòng 50 giờ máy chạy
        } else {
          maintenanceStatus = 'GOOD'; // Đang hoạt động tốt
        }
      }

      // Kiểm tra tình trạng tồn kho thực tế
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
        installationPosition: bom.installationPosition || 'Hệ thống máy nén khí',
        isCritical: bom.isCritical,
        // Thông tin định mức
        replacementIntervalHours: intervalHours,
        replacementIntervalDays: intervalDays,
        // Dữ liệu theo dõi thực tế
        lastReplacedDate,
        lastReplacedOperatingHours,
        hoursSinceLastReplacement: Number(hoursSinceLastReplacement.toFixed(2)),
        remainingHoursUntilReplacement: remainingHours,
        maintenanceStatus, // OVERDUE | DUE_SOON | GOOD
        // Dữ liệu tồn kho
        currentStock: inStock,
        shelfLocation: part.shelfLocation || 'Chưa xếp kệ',
        stockStatus, // AVAILABLE | LOW_STOCK | OUT_OF_STOCK
      };
    });

    // Thống kê chỉ số MTTR & MTBF của thiết bị
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
}
