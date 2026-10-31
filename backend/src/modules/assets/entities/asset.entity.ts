import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL',
  DOWN = 'DOWN',
  MAINTENANCE = 'MAINTENANCE',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  @Index()
  asset_code: string; // Ví dụ: "AST-001"

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 100, nullable: true })
  manufacturer: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ length: 100, nullable: true })
  serial_number: string;

  // FK đến bảng locations (SV02 cũng phụ trách module locations)
  @Column({ type: 'uuid', nullable: true })
  location_id: string;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.OPERATIONAL,
  })
  status: AssetStatus;

  @Column({ type: 'date', nullable: true })
  install_date: Date;

  @Column({ type: 'date', nullable: true })
  warranty_expiry_date: Date;

  @Column({ type: 'float', default: 0 })
  operating_hours: number;

  @Column({ nullable: true })
  qr_code_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
