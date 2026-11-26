import { Column, Entity, JoinColumn, ManyToOne, Index } from "typeorm";
import { AppBaseEntity } from "../../../common/base.entity";
import { User } from "../../auth/entities/user.entity";
import { Asset } from "../../assets/entities/asset.entity";
import { ReadingImport } from "./reading-import.entity";

@Entity("asset_reading_submissions")
export class AssetReadingSubmission extends AppBaseEntity {
  @Column({ name: "asset_id", type: "uuid" }) assetId: string;
  @ManyToOne(() => Asset, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "asset_id" }) asset: Asset;
  @Column({ name: "created_by_id", type: "uuid" }) createdById: string;
  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "created_by_id" }) createdBy: User;
  @Column({ name: "import_id", type: "uuid", nullable: true }) importId: string | null;
  @ManyToOne(() => ReadingImport, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "import_id" }) batch: ReadingImport;
  @Column({ name: "row_number", type: "int", nullable: true }) rowNumber: number | null;
  @Column({ name: "measured_at", type: "timestamptz" }) measuredAt: Date;
  @Column({ length: 20 }) source: string;
  @Column({ type: "text", nullable: true }) notes: string | null;
}

@Entity("asset_readings")
@Index("uq_current_asset_reading", ["assetId", "parameter", "measuredAt"], { unique: true, where: "is_current_version = true" })
export class AssetReading extends AppBaseEntity {
  @Column({ name: "submission_id", type: "uuid" }) submissionId: string;
  @ManyToOne(() => AssetReadingSubmission, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "submission_id" }) submission: AssetReadingSubmission;
  @Column({ name: "asset_id", type: "uuid" }) assetId: string;
  @ManyToOne(() => Asset, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "asset_id" }) asset: Asset;
  @Column({ length: 30 }) parameter: string;
  @Column({ type: "decimal", precision: 14, scale: 4 }) value: number;
  @Column({ length: 20 }) unit: string;
  @Column({ name: "measured_at", type: "timestamptz" }) measuredAt: Date;
  @Column({ name: "is_current_version", default: true }) isCurrentVersion: boolean;
  @Column({ name: "supersedes_id", type: "uuid", nullable: true, unique: true }) supersedesId: string | null;
  @ManyToOne(() => AssetReading, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "supersedes_id" }) supersedes: AssetReading;
}
