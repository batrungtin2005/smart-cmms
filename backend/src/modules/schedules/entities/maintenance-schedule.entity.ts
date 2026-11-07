import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { User } from '../../auth/entities/user.entity';
import { WorkOrder } from '../../work-orders/entities/work-order.entity';
import { WorkOrderPriority } from '../../work-orders/entities/work-order.enums';

export enum ScheduleType {
  TIME_BASED = 'TIME_BASED',
  USAGE_BASED = 'USAGE_BASED',
  CONDITION_BASED = 'CONDITION_BASED',
}

@Entity('maintenance_schedules')
export class MaintenanceSchedule extends AppBaseEntity {
  @Column({ name: 'schedule_code', length: 50, unique: true })
  scheduleCode: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @ManyToOne(() => Asset, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'schedule_type', type: 'enum', enum: ScheduleType, enumName: 'schedule_type_enum' })
  scheduleType: ScheduleType;

  @Column({ name: 'interval_days', type: 'int', nullable: true })
  intervalDays: number | null;

  @Column({ name: 'interval_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  intervalHours: number | null;

  @Column({ name: 'operating_hours_at_last_trigger', type: 'decimal', precision: 10, scale: 2, nullable: true })
  operatingHoursAtLastTrigger: number | null;

  @Column({ name: 'condition_parameter', length: 100, nullable: true })
  conditionParameter: string | null;

  @Column({ name: 'condition_threshold', type: 'decimal', precision: 10, scale: 4, nullable: true })
  conditionThreshold: number | null;

  @Column({ name: 'condition_operator', length: 10, nullable: true })
  conditionOperator: string | null;

  @Column({ type: 'enum', enum: WorkOrderPriority, enumName: 'work_order_priority_enum', default: WorkOrderPriority.MEDIUM })
  priority: WorkOrderPriority;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  @Column({ name: 'estimated_duration_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedDurationHours: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date | null;

  @Column({ name: 'next_due_date', type: 'date', nullable: true })
  nextDueDate: string | null;

  @Column({ name: 'next_due_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  nextDueHours: number | null;

  @Column({ name: 'advance_notice_days', type: 'int', default: 3 })
  advanceNoticeDays: number;

  @Column({ name: 'last_work_order_id', type: 'uuid', nullable: true })
  lastWorkOrderId: string | null;

  @ManyToOne(() => WorkOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_work_order_id', foreignKeyConstraintName: 'fk_schedule_last_wo' })
  lastWorkOrder: WorkOrder | null;
}
