import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Part } from "../../parts/entities/part.entity";
import { PartTransaction } from "../../parts/entities/part-transaction.entity";
import { MaterialRequest } from "./material-request.entity";

@Entity("material_request_items")
@Unique("uq_material_request_part", ["requestId", "partId"])
@Check("quantity > 0")
export class MaterialRequestItem {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "request_id", type: "uuid" }) requestId: string;
  @ManyToOne(() => MaterialRequest, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "request_id" })
  request: MaterialRequest;
  @Column({ name: "part_id", type: "uuid" }) partId: string;
  @ManyToOne(() => Part, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "part_id" })
  part: Part;
  @Column({ type: "int" }) quantity: number;
  @Column({
    name: "unit_price",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitPrice: number | null;
  @Column({
    name: "transaction_id",
    type: "uuid",
    nullable: true,
    unique: true,
  })
  transactionId: string | null;
  @ManyToOne(() => PartTransaction, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "transaction_id" })
  transaction: PartTransaction;
}
