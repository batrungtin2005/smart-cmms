import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Location } from '../../locations/entities/location.entity';
import { AssetHistory } from '../../history/entities/asset-history.entity';
import { AssetPartBom } from '../../parts/entities/asset-part-bom.entity';
import { WorkOrder } from '../../work-orders/entities/work-order.entity';

export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL',     // Đang hoạt động bình thường
  DOWN = 'DOWN',                   // Đang gặp sự cố hỏng hóc, dừng máy
  MAINTENANCE = 'MAINTENANCE',     // Đang bảo trì định kỳ / bảo dưỡng
  DECOMMISSIONED = 'DECOMMISSIONED'// Ngừng hoạt động / thanh lý
}

export enum AssetCriticality {
  LOW = 'LOW',         // Ít quan trọng
  MEDIUM = 'MEDIUM',   // Trung bình
  HIGH = 'HIGH',       // Quan trọng cao
  CRITICAL = 'CRITICAL'// Cực kỳ quan trọng (dừng là tê liệt dây chuyền)
}

@Entity('assets')
export class Asset extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ name: 'asset_code', unique: true, length: 50 })
  assetCode: string; // VD: "AST-001", "AST-300"

  @Column({ length: 200 })
  name: string; // VD: "Máy Ép Thủy Lực 500T"

  @Column({ length: 100 })
  category: string; // VD: "Cơ khí", "Thủy lực", "Điện tự động hóa", "Khí nén"

  @Column({ length: 100, nullable: true })
  manufacturer: string; // VD: "Mitsubishi", "Siemens", "Komatsu"

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ name: 'serial_number', length: 100, nullable: true })
  serialNumber: string;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @ManyToOne(() => Location, (location) => location.assets, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.OPERATIONAL,
  })
  status: AssetStatus;

  @Column({
    type: 'enum',
    enum: AssetCriticality,
    default: AssetCriticality.MEDIUM,
  })
  criticality: AssetCriticality;

  @Column({ name: 'install_date', type: 'date', nullable: true })
  installDate: Date;

  @Column({ name: 'warranty_expiry_date', type: 'date', nullable: true })
  warrantyExpiryDate: Date;

  // Dữ liệu đo lường vận hành máy (Operating Hours) - Cốt lõi cho MTBF
  @Column({
    name: 'operating_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  operatingHours: number;

  @Column({ name: 'qr_code_url', length: 500, nullable: true })
  qrCodeUrl: string;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  specifications: Record<string, any>; // Lưu công suất (kW), áp suất (bar), điện áp (V)...

  // Các trường lưu vết thống kê nhanh MTTR & MTBF
  @Column({ name: 'total_failures', type: 'int', default: 0 })
  totalFailures: number; // Tổng số lần máy hỏng đột xuất (Breakdown)

  @Column({
    name: 'total_repair_time_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalRepairTimeHours: number; // Tổng giờ sửa chữa tích lũy (dùng tính MTTR)

  @Column({ name: 'last_failure_date', type: 'timestamptz', nullable: true })
  lastFailureDate: Date | null;

  // Cache chỉ số MTTR & MTBF gần nhất để render nhanh Dashboard 300 máy
  @Column({
    name: 'cached_mttr_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  cachedMttrHours: number;

  @Column({
    name: 'cached_mtbf_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  cachedMtbfHours: number;

  @Column({ name: 'metrics_last_updated_at', type: 'timestamptz', nullable: true })
  metricsLastUpdatedAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Quan hệ
  @OneToMany(() => AssetHistory, (history) => history.asset)
  historyLogs: AssetHistory[];

  @OneToMany(() => AssetPartBom, (bom) => bom.asset)
  bomParts: AssetPartBom[];

  @OneToMany(() => WorkOrder, (workOrder) => workOrder.asset)
  workOrders: WorkOrder[];
}
