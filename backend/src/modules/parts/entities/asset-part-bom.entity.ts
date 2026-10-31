import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { Part } from './part.entity';

@Entity('asset_part_boms')
@Unique(['assetId', 'partId'])
export class AssetPartBom extends AppBaseEntity {
  @Index()
  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @ManyToOne(() => Asset, (asset) => asset.bomParts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Index()
  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part, (part) => part.bomLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'part_id' })
  part: Part;

  // Định mức số lượng lắp ráp/sử dụng trên 1 thiết bị
  @Column({
    name: 'standard_quantity',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 1,
  })
  standardQuantity: number;

  // Định mức chu kỳ thay thế theo giờ hoạt động (phục vụ bảo trì dự phòng PM)
  @Column({
    name: 'replacement_interval_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  replacementIntervalHours: number;

  // Định mức chu kỳ thay thế theo ngày dương lịch
  @Column({ name: 'replacement_interval_days', type: 'int', nullable: true })
  replacementIntervalDays: number;

  // Đánh dấu phụ tùng thiết yếu / quan trọng sống còn của máy
  @Column({ name: 'is_critical', default: false })
  isCritical: boolean;

  @Column({ name: 'installation_position', length: 255, nullable: true })
  installationPosition: string; // VD: "Trục chính động cơ 15kW", "Hộp giảm tốc số 2"

  @Column({ length: 255, nullable: true })
  notes: string;
}
