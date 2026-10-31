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
}
