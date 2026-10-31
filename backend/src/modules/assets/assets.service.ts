import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  // GET /api/v1/assets — Danh sách có phân trang, tìm kiếm, lọc
  async findAll(query: QueryAssetDto) {
    const { search, status, location_id, page = 1, limit = 20 } = query;

    const where: any[] = [];

    const baseWhere: Record<string, any> = {};
    if (status) baseWhere.status = status;
    if (location_id) baseWhere.location_id = location_id;

    if (search) {
      // Tìm theo mã hoặc tên
      where.push({ ...baseWhere, asset_code: ILike(`%${search}%`) });
      where.push({ ...baseWhere, name: ILike(`%${search}%`) });
    } else {
      where.push(baseWhere);
    }

    const [data, total] = await this.assetRepo.findAndCount({
      where,
      order: { asset_code: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET /api/v1/assets/:id — Chi tiết 1 thiết bị
  async findOne(id: string) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Không tìm thấy thiết bị với id: ${id}`);
    }
    return asset;
  }

  // GET /api/v1/assets/code/:code — Tra cứu nhanh theo mã QR
  async findByCode(code: string) {
    const asset = await this.assetRepo.findOne({ where: { asset_code: code } });
    if (!asset) {
      throw new NotFoundException(`Không tìm thấy thiết bị với mã: ${code}`);
    }
    return asset;
  }

  // POST /api/v1/assets — Tạo mới tài sản
  async create(dto: CreateAssetDto) {
    // Kiểm tra trùng asset_code
    const existing = await this.assetRepo.findOne({
      where: { asset_code: dto.asset_code },
    });
    if (existing) {
      throw new ConflictException(
        `Mã thiết bị "${dto.asset_code}" đã tồn tại trong hệ thống`,
      );
    }

    const asset = this.assetRepo.create(dto);

    // Tự động sinh qr_code_url theo quy ước
    asset.qr_code_url = `/qr/${dto.asset_code}.png`;

    return this.assetRepo.save(asset);
  }

  // PATCH /api/v1/assets/:id — Cập nhật thông tin hoặc trạng thái
  async update(id: string, dto: UpdateAssetDto) {
    const asset = await this.findOne(id);

    // Nếu đổi asset_code thì kiểm tra trùng
    if (dto.asset_code && dto.asset_code !== asset.asset_code) {
      const existing = await this.assetRepo.findOne({
        where: { asset_code: dto.asset_code },
      });
      if (existing) {
        throw new ConflictException(
          `Mã thiết bị "${dto.asset_code}" đã tồn tại trong hệ thống`,
        );
      }
      // Cập nhật lại QR URL theo mã mới
      dto['qr_code_url'] = `/qr/${dto.asset_code}.png`;
    }

    Object.assign(asset, dto);
    return this.assetRepo.save(asset);
  }
}
