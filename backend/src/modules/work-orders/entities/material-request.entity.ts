import { Column, Entity, JoinColumn, ManyToOne, Index } from "typeorm";
import { AppBaseEntity } from "../../../common/base.entity";
import { User } from "../../auth/entities/user.entity";
import { WorkOrder } from "./work-order.entity";

export enum MaterialRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

@Entity("material_requests")
export class MaterialRequest extends AppBaseEntity {
  @Index()
  @Column({ name: "work_order_id", type: "uuid" })
  workOrderId: string;
  @ManyToOne(() => WorkOrder, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "work_order_id" })
  workOrder: WorkOrder;
  @Column({ name: "requested_by_id", type: "uuid" }) requestedById: string;
  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "requested_by_id" })
  requestedBy: User;
  @Index()
  @Column({
    type: "enum",
    enum: MaterialRequestStatus,
    enumName: "material_request_status_enum",
    default: MaterialRequestStatus.PENDING,
  })
  status: MaterialRequestStatus;
  @Column({ type: "text", nullable: true }) notes: string | null;
  @Column({ name: "resolved_by_id", type: "uuid", nullable: true })
  resolvedById: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "resolved_by_id" })
  resolvedBy: User;
  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt: Date | null;
  @Column({ name: "resolution_reason", type: "text", nullable: true })
  resolutionReason: string | null;
}
