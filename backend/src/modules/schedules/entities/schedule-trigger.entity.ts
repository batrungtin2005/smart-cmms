import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { AppBaseEntity } from "../../../common/base.entity";
import { WorkOrder } from "../../work-orders/entities/work-order.entity";
import { User } from "../../auth/entities/user.entity";
import { MaintenanceSchedule } from "./maintenance-schedule.entity";
import { AssetReading } from "./asset-reading.entity";

@Entity("schedule_triggers")
@Unique("uq_schedule_cycle", ["scheduleId", "cycle"])
export class ScheduleTrigger extends AppBaseEntity {
  @Column({ name: "schedule_id", type: "uuid" }) scheduleId: string;
  @ManyToOne(() => MaintenanceSchedule, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "schedule_id" }) schedule: MaintenanceSchedule;
  @Column({ type: "int" }) cycle: number;
  @Column({ name: "work_order_id", type: "uuid", unique: true }) workOrderId: string;
  @ManyToOne(() => WorkOrder, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "work_order_id" }) workOrder: WorkOrder;
  @Column({ name: "reading_id", type: "uuid", nullable: true }) readingId: string | null;
  @ManyToOne(() => AssetReading, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "reading_id" }) reading: AssetReading;
  @Column({ name: "assigned_technician_id", type: "uuid", nullable: true }) assignedTechnicianId: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_technician_id" }) assignedTechnician: User;
  @Column({ type: "jsonb" }) snapshot: Record<string, unknown>;
  @Column({ length: 20, default: "OPEN" }) outcome: string;
  @Column({ name: "accepted_reading_id", type: "uuid", nullable: true }) acceptedReadingId: string | null;
  @ManyToOne(() => AssetReading, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "accepted_reading_id" }) acceptedReading: AssetReading;
  @Column({ name: "resolution_notes", type: "text", nullable: true }) resolutionNotes: string | null;
}
