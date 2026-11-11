import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto';

export interface LocationTreeNode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  assetCount: number;
  children: LocationTreeNode[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  /**
   * 1. LẤY CÂU TRÚC CÂY THƯ MỤC VỊ TRÍ ĐA CẤP (Nhà máy -> Phân xưởng -> Khu vực -> Dây chuyền)
   * Kèm số lượng thiết bị thực tế đang vận hành tại từng vị trí
   */
  async getTree(): Promise<LocationTreeNode[]> {
    // Lấy toàn bộ vị trí đang kích hoạt kèm thiết bị để đếm số lượng
    const allLocations = await this.locationRepo
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.assets', 'asset', 'asset.isActive = :active', {
        active: true,
      })
      .where('location.isActive = :isActive', { isActive: true })
      .orderBy('location.code', 'ASC')
      .getMany();

    // Map các node
    const nodeMap = new Map<string, LocationTreeNode>();
    allLocations.forEach((loc) => {
      nodeMap.set(loc.id, {
        id: loc.id,
        code: loc.code,
        name: loc.name,
        description: loc.description,
        parentId: loc.parentId,
        isActive: loc.isActive,
        assetCount: loc.assets ? loc.assets.length : 0,
        children: [],
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
      });
    });

    // Xây dựng cây phân cấp cha - con
    const rootNodes: LocationTreeNode[] = [];
    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  /**
   * 2. LẤY DANH SÁCH VỊ TRÍ (Dạng phẳng hoặc dạng cây)
   */
  async findAll(asTree = false): Promise<any> {
    if (asTree) {
      return this.getTree();
    }

    return this.locationRepo
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.parent', 'parent')
      .loadRelationCountAndMap('location.assetCount', 'location.assets', 'asset', (qb) =>
        qb.where('asset.isActive = :active', { active: true }),
      )
      .where('location.isActive = :isActive', { isActive: true })
      .orderBy('location.code', 'ASC')
      .getMany();
  }

  /**
   * 3. XEM CHI TIẾT 1 VỊ TRÍ
   */
  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepo.findOne({
      where: { id, isActive: true },
      relations: ['parent', 'children', 'assets'],
    });

    if (!location) {
      throw new NotFoundException(`Không tìm thấy vị trí với ID: ${id}`);
    }

    return location;
  }

  /**
   * 4. THÊM MỚI VỊ TRÍ TRONG CÂY NHÀ XƯỞNG
   */
  async create(dto: CreateLocationDto): Promise<Location> {
    const cleanCode = dto.code.trim().toUpperCase();

    // Kiểm tra trùng mã code
    const existing = await this.locationRepo.findOne({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new ConflictException(`Mã vị trí '${cleanCode}' đã tồn tại trên hệ thống!`);
    }

    // Nếu có parentId, kiểm tra vị trí cha có tồn tại và đang active không
    if (dto.parentId) {
      const parent = await this.locationRepo.findOne({
        where: { id: dto.parentId, isActive: true },
      });
      if (!parent) {
        throw new NotFoundException(
          `Vị trí cấp cha với ID '${dto.parentId}' không tồn tại hoặc đã bị vô hiệu hóa!`,
        );
      }
    }

    const location = this.locationRepo.create({
      ...dto,
      code: cleanCode,
      name: dto.name.trim(),
    });

    return this.locationRepo.save(location);
  }

  /**
   * 5. CẬP NHẬT THÔNG TIN VỊ TRÍ
   */
  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);

    // Kiểm tra trùng mã với vị trí khác
    if (dto.code && dto.code.trim().toUpperCase() !== location.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const duplicate = await this.locationRepo.findOne({
        where: { code: cleanCode },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Mã vị trí '${cleanCode}' đã được sử dụng!`);
      }
      location.code = cleanCode;
    }

    // Kiểm tra chống tạo vòng lặp cây: Một vị trí không thể làm con của chính nó
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Một vị trí không thể đặt chính nó làm vị trí cha!');
      }
      const parent = await this.locationRepo.findOne({
        where: { id: dto.parentId, isActive: true },
      });
      if (!parent) {
        throw new NotFoundException(`Vị trí cha '${dto.parentId}' không tồn tại!`);
      }
      location.parentId = dto.parentId;
    } else if (dto.parentId === null) {
      location.parentId = null;
    }

    if (dto.name) location.name = dto.name.trim();
    if (dto.description !== undefined) location.description = dto.description;

    return this.locationRepo.save(location);
  }

  /**
   * 6. VÔ HIỆU HÓA VỊ TRÍ (SOFT DELETE)
   * Kiểm tra ràng buộc để bảo vệ dữ liệu cây và thiết bị
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const location = await this.locationRepo.findOne({
      where: { id },
      relations: ['children', 'assets'],
    });

    if (!location) {
      throw new NotFoundException(`Không tìm thấy vị trí với ID: ${id}`);
    }

    // Kiểm tra nếu có vị trí con đang hoạt động
    const activeChildren = (location.children || []).filter((c) => c.isActive);
    if (activeChildren.length > 0) {
      throw new ConflictException(
        `Không thể xóa vị trí này vì đang có ${activeChildren.length} vị trí cấp con trực thuộc. Vui lòng chuyển hoặc xóa các vị trí con trước!`,
      );
    }

    // Kiểm tra nếu có thiết bị đang thuộc vị trí này
    const activeAssets = (location.assets || []).filter((a) => a.isActive);
    if (activeAssets.length > 0) {
      throw new ConflictException(
        `Không thể xóa vị trí này vì đang có ${activeAssets.length} thiết bị trực thuộc. Vui lòng di dời các thiết bị sang vị trí khác trước!`,
      );
    }

    location.isActive = false;
    await this.locationRepo.save(location);

    return {
      success: true,
      message: `Đã vô hiệu hóa thành công vị trí: ${location.name} (${location.code})`,
    };
  }

  /**
   * 7. LẤY TOÀN BỘ THIẾT BỊ ĐANG ĐẶT TẠI VỊ TRÍ NÀY
   */
  async getAssetsByLocation(id: string) {
    const location = await this.findOne(id);
    return location.assets || [];
  }
}
