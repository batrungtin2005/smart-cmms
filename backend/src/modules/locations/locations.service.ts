import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async findAll(asTree = false): Promise<Location[]> {
    if (asTree) {
      // Lấy toàn bộ cây vị trí (cấp cao nhất và các con)
      return this.locationRepo.find({
        where: { parentId: null as any, isActive: true },
        relations: ['children', 'children.children'],
        order: { code: 'ASC' },
      });
    }

    return this.locationRepo.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepo.findOne({
      where: { id },
      relations: ['parent', 'children', 'assets'],
    });
    if (!location) {
      throw new NotFoundException(`Không tìm thấy vị trí với ID: ${id}`);
    }
    return location;
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    const existing = await this.locationRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Mã vị trí '${dto.code}' đã tồn tại!`);
    }

    const location = this.locationRepo.create(dto);
    return this.locationRepo.save(location);
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);
    Object.assign(location, dto);
    return this.locationRepo.save(location);
  }
}
