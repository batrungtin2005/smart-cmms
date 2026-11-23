import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { AppBaseEntity } from "../../../common/base.entity";
import { User } from "../../auth/entities/user.entity";
import { ImportError, ImportRow } from "../pm.types";

@Entity("reading_import_batches")
@Unique("uq_reading_import_checksum", ["createdById", "checksum"])
export class ReadingImport extends AppBaseEntity {
  @Column({ name: "created_by_id", type: "uuid" }) createdById: string;
  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "created_by_id" }) createdBy: User;
  @Column({ length: 255 }) filename: string;
  @Column({ length: 64 }) checksum: string;
  @Column({ name: "template_version", length: 10, default: "1" }) templateVersion: string;
  @Column({ length: 20, default: "PREVIEW" }) status: string;
  @Column({ type: "jsonb", default: [] }) rows: ImportRow[];
  @Column({ type: "jsonb", default: [] }) errors: ImportError[];
  @Column({ name: "expires_at", type: "timestamptz" }) expiresAt: Date;
  @Column({ name: "confirmed_at", type: "timestamptz", nullable: true }) confirmedAt: Date | null;
  @Column({ name: "evaluation_status", length: 20, default: "NOT_STARTED" }) evaluationStatus: string;
  @Column({ name: "evaluation_error", type: "text", nullable: true }) evaluationError: string | null;
}
