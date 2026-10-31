import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Asset, AssetStatus } from '../../assets/entities/asset.entity';
import { WorkOrder } from '../../work-orders/entities/work-order.entity';
import { User } from '../../auth/entities/user.entity';

export enum MaintenanceEventType {
  BREAKDOWN = 'BREAKDOWN',                     // Sự cố hỏng máy dừng sản xuất
  CORRECTIVE_REPAIR = 'CORRECTIVE_REPAIR',     // Sửa chữa phục hồi sau sự cố
  PREVENTIVE_MAINTENANCE = 'PREVENTIVE_MAINTENANCE', // Bảo dưỡng phòng ngừa định kỳ
  INSPECTION = 'INSPECTION',                   // Kiểm tra kỹ thuật định kỳ
  PART_REPLACEMENT = 'PART_REPLACEMENT',       // Thay thế phụ tùng hao mòn
  CALIBRATION = 'CALIBRATION'                  // Hiệu chuẩn thiết bị
}

@Entity('asset_maintenance_history')
export class AssetHistory extends AppBaseEntity {
  @Index()
  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @ManyToOne(() => Asset, (asset) => asset.historyLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Index()
  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId: string | null;

  @ManyToOne(() => WorkOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder | null;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: MaintenanceEventType,
    default: MaintenanceEventType.CORRECTIVE_REPAIR,
  })
  eventType: MaintenanceEventType;

  @Column({ length: 255 })
  title: string; // VD: "Sửa chữa kẹt pít-tông xi lanh số 2"

  @Column({ type: 'text', nullable: true })
  description: string;

  // ================= CÁC TRƯỜNG DỮ LIỆU TÍNH MTTR =================
  // Thời điểm sự cố bắt đầu khiến máy ngừng hoạt động
  @Column({ name: 'breakdown_time', type: 'timestamptz', nullable: true })
  breakdownTime: Date | null;

  // Thời điểm kỹ thuật viên bắt đầu sửa chữa
  @Column({ name: 'repair_start_time', type: 'timestamptz', nullable: true })
  repairStartTime: Date | null;

  // Thời điểm hoàn tất sửa chữa, máy sẵn sàng vận hành
  @Column({ name: 'repair_end_time', type: 'timestamptz', nullable: true })
  repairEndTime: Date | null;

  // Thời gian dừng máy thực tế (tính bằng giờ, breakdown -> repair_end)
  @Column({
    name: 'downtime_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  downtimeHours: number;

  // Thời gian sửa chữa thực tế (tính bằng giờ, repair_start -> repair_end) -> TRỌNG TÂM MTTR
  @Column({
    name: 'actual_repair_time_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  actualRepairTimeHours: number;

  // ================= CÁC TRƯỜNG DỮ LIỆU TÍNH MTBF =================
  // Số giờ máy đã chạy tích lũy tại thời điểm phát sinh sự cố -> TRỌNG TÂM MTBF
  @Column({
    name: 'operating_hours_at_failure',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  operatingHoursAtFailure: number;

  // Thời gian máy chạy an toàn giữa 2 lần hỏng liên tiếp (Time Between Failures - TBF)
  @Column({
    name: 'time_between_failures_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  timeBetweenFailuresHours: number | null;

  // Đánh dấu đây có phải lần hỏng máy dừng sản xuất không (để đếm N lần hỏng cho MTBF)
  @Column({ name: 'is_failure_counted', default: false })
  isFailureCounted: boolean;

  // ================= CHI TIẾT KỸ THUẬT & CHI PHÍ =================
  @Column({ name: 'failure_cause', length: 255, nullable: true })
  failureCause: string; // Nguyên nhân hỏng hóc

  @Column({ name: 'action_taken', type: 'text', nullable: true })
  actionTaken: string; // Biện pháp khắc phục đã thực hiện

  @Column({
    name: 'status_before',
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.DOWN,
  })
  statusBefore: AssetStatus;

  @Column({
    type: 'enum',
    name: 'status_after',
    enum: AssetStatus,
    default: AssetStatus.OPERATIONAL,
  })
  statusAfter: AssetStatus;

  // Danh mục phụ tùng thay thế (JSON Snapshot phục vụ đối chiếu lịch sử)
  @Column({ type: 'jsonb', nullable: true, default: [] })
  partsReplaced: Array<{
    partId: string;
    partCode: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  @Column({
    name: 'cost_parts',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  costParts: number;

  @Column({
    name: 'cost_labor',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  costLabor: number;

  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalCost: number;

  @Column({ name: 'performed_by_id', type: 'uuid', nullable: true })
  performedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User | null;
}
