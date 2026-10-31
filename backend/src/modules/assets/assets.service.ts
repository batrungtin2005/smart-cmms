import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, ILike } from 'typeorm';
import { Asset, AssetStatus } from './entities/asset.entity';
import { CreateAssetDto, QueryAssetDto, UpdateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

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
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id, isActive: true },
      relations: [
        'location',
        'bomParts',
        'bomParts.part',
        'historyLogs',
      ],
    });

    if (!asset) {
      throw new NotFoundException(`Không tìm thấy thiết bị có ID: ${id}`);
    }

    return asset;
  }

  async findByCode(assetCode: string): Promise<Asset> {
    const cleanCode = assetCode.trim().toUpperCase();
    const asset = await this.assetRepo.findOne({
      where: { assetCode: cleanCode, isActive: true },
      relations: ['location', 'bomParts', 'bomParts.part'],
    });

    if (!asset) {
      throw new NotFoundException(
        `Không tìm thấy thiết bị có mã QR/Code: ${assetCode}`,
      );
    }

    return asset;
  }

  async create(dto: CreateAssetDto): Promise<Asset> {
    const assetCode = dto.assetCode.trim().toUpperCase();
    const existing = await this.assetRepo.findOne({
      where: { assetCode },
    });

    if (existing) {
      throw new ConflictException(`Mã tài sản '${assetCode}' đã tồn tại!`);
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
    });

    return this.assetRepo.save(newAsset);
  }

  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);
    Object.assign(asset, dto);
    return this.assetRepo.save(asset);
  }

  // Tăng số giờ hoạt động của máy (phục vụ tính toán MTBF & kích hoạt bảo trì dự phòng PM)
  async incrementOperatingHours(id: string, additionalHours: number): Promise<Asset> {
    const asset = await this.findOne(id);
    asset.operatingHours = Number(asset.operatingHours) + Number(additionalHours);
    return this.assetRepo.save(asset);
  }

  // Cập nhật trạng thái sự cố và thống kê sửa chữa khi Work Order hoàn tất
  async recordFailureAndRepair(
    id: string,
    repairTimeHours: number,
    failureTime: Date,
  ): Promise<Asset> {
    const asset = await this.findOne(id);
    asset.totalFailures = (asset.totalFailures || 0) + 1;
    asset.totalRepairTimeHours =
      Number(asset.totalRepairTimeHours || 0) + Number(repairTimeHours);
    asset.lastFailureDate = failureTime;

    // Cập nhật ngay chỉ số MTTR & MTBF cache cho máy
    if (asset.totalFailures > 0) {
      asset.cachedMttrHours = Number(
        (asset.totalRepairTimeHours / asset.totalFailures).toFixed(2),
      );
      asset.cachedMtbfHours = Number(
        (Number(asset.operatingHours) / asset.totalFailures).toFixed(2),
      );
      asset.metricsLastUpdatedAt = new Date();
    }

    return this.assetRepo.save(asset);
  }
}
