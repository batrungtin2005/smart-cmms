import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { User } from '../../auth/entities/user.entity';

export enum WorkOrderStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export enum WorkOrderType {
  CORRECTIVE = 'CORRECTIVE',   // Sửa chữa sự cố (Breakdown / Unplanned)
  PREVENTIVE = 'PREVENTIVE',   // Bảo trì định kỳ (Planned PM)
  EMERGENCY = 'EMERGENCY',     // Khẩn cấp dừng toàn xưởng
  INSPECTION = 'INSPECTION',   // Kiểm tra định kỳ
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('work_orders')
export class WorkOrder extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ name: 'work_order_code', unique: true, length: 50 })
  workOrderCode: string; // VD: "WO-2026-0001"

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @ManyToOne(() => Asset, (asset) => asset.workOrders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({
    type: 'enum',
    enum: WorkOrderType,
    default: WorkOrderType.CORRECTIVE,
  })
  type: WorkOrderType;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.OPEN,
  })
  status: WorkOrderStatus;

  @Column({
    type: 'enum',
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
  })
  priority: WorkOrderPriority;

  @Column({ name: 'assigned_technician_id', type: 'uuid', nullable: true })
  assignedTechnicianId: string | null;

  @ManyToOne(() => User, (user) => user.assignedWorkOrders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_technician_id' })
  assignedTechnician: User | null;

  // Dữ liệu thời gian tính MTTR và MTBF
  @Column({ name: 'breakdown_time', type: 'timestamptz', nullable: true })
  breakdownTime: Date | null; // Thời điểm máy hỏng / dừng hoạt động

  @Column({ name: 'start_time', type: 'timestamptz', nullable: true })
  startTime: Date | null; // Thời điểm kỹ thuật viên bắt đầu sửa

  @Column({ name: 'completed_time', type: 'timestamptz', nullable: true })
  completedTime: Date | null; // Thời điểm hoàn thành sửa chữa

  @Column({
    name: 'actual_repair_time_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  actualRepairTimeHours: number; // Thời gian sửa thực tế (đầu vào trực tiếp cho MTTR)

  @Column({
    name: 'downtime_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  downtimeHours: number; // Tổng thời gian máy bị chết (breakdown -> completed)

  @Column({ type: 'text', nullable: true })
  rootCause: string;

  @Column({ type: 'text', nullable: true })
  solution: string;
}
