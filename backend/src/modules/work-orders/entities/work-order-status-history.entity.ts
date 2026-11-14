import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { WorkOrder } from "./work-order.entity";
import { WorkOrderStatus } from "./work-order.enums";

@Entity("work_order_status_history")
@Unique("uq_wo_history_sequence", ["workOrderId", "sequence"])
@Check("sequence > 0")
@Check(
  "to_status NOT IN ('ON_HOLD', 'CANCELLED') OR (reason IS NOT NULL AND length(trim(reason)) > 0)",
)
export class WorkOrderStatusHistory {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "work_order_id", type: "uuid" }) workOrderId: string;
  @ManyToOne(() => WorkOrder, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "work_order_id" })
  workOrder: WorkOrder;
  @Column({ type: "int" }) sequence: number;
  @Column({
    name: "from_status",
    type: "enum",
    enum: WorkOrderStatus,
    enumName: "work_order_status_enum",
    nullable: true,
  })
  fromStatus: WorkOrderStatus | null;
  @Column({
    name: "to_status",
    type: "enum",
    enum: WorkOrderStatus,
    enumName: "work_order_status_enum",
  })
  toStatus: WorkOrderStatus;
  @Column({ name: "performed_by_id", type: "uuid" }) performedById: string;
  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "performed_by_id" })
  performedBy: User;
  @Column({ name: "assigned_technician_id", type: "uuid", nullable: true })
  assignedTechnicianId: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_technician_id" })
  assignedTechnician: User;
  @Column({ type: "text", nullable: true }) reason: string | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
