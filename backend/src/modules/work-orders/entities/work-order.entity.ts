import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { User } from '../../auth/entities/user.entity';
import { MaintenanceSchedule } from '../../schedules/entities/maintenance-schedule.entity';
import { WorkOrderPriority, WorkOrderStatus, WorkOrderType } from './work-order.enums';
export { WorkOrderPriority, WorkOrderStatus, WorkOrderType } from './work-order.enums';

@Entity('work_orders')
@Check('chk_wo_completion_after_breakdown', 'completed_time IS NULL OR breakdown_time IS NULL OR completed_time >= breakdown_time')
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

  @ManyToOne(() => Asset, (asset) => asset.workOrders, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  scheduleId: string | null;

  @ManyToOne(() => MaintenanceSchedule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: MaintenanceSchedule | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({
    type: 'enum',
    enum: WorkOrderType,
    enumName: 'work_order_type_enum',
    default: WorkOrderType.CORRECTIVE,
  })
  type: WorkOrderType;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    enumName: 'work_order_status_enum',
    default: WorkOrderStatus.OPEN,
  })
  status: WorkOrderStatus;

  @Column({
    type: 'enum',
    enum: WorkOrderPriority,
    enumName: 'work_order_priority_enum',
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

  @Column({ name: 'scheduled_start_date', type: 'date', nullable: true })
  scheduledStartDate: string | null;

  @Column({ name: 'scheduled_end_date', type: 'date', nullable: true })
  scheduledEndDate: string | null;

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
    asExpression: 'CASE WHEN breakdown_time IS NULL OR completed_time IS NULL THEN 0 ELSE EXTRACT(EPOCH FROM (completed_time - breakdown_time)) / 3600 END',
    generatedType: 'STORED',
    insert: false,
    update: false,
  })
  downtimeHours: number; // Tổng thời gian máy bị chết (breakdown -> completed)

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause: string;

  @Column({ type: 'text', nullable: true })
  solution: string;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  estimatedCost: number;

  @Column({ name: 'actual_cost_parts', type: 'decimal', precision: 12, scale: 2, default: 0 })
  actualCostParts: number;

  @Column({ name: 'actual_cost_labor', type: 'decimal', precision: 12, scale: 2, default: 0 })
  actualCostLabor: number;

  @Column({ name: 'total_actual_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalActualCost: number;

  @Column({ name: 'completion_notes', type: 'text', nullable: true })
  completionNotes: string | null;

  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes: string | null;

  @Column({ name: 'verified_by_id', type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy: User | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'client_uuid', type: 'uuid', nullable: true, unique: true })
  clientUuid: string | null;
}
