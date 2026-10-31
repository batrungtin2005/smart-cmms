import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { AssetPartBom } from './asset-part-bom.entity';
import { PartTransaction } from './part-transaction.entity';

export enum PartStatus {
  IN_STOCK = 'IN_STOCK',       // Đầy đủ trong kho
  LOW_STOCK = 'LOW_STOCK',     // Dưới ngưỡng an toàn
  OUT_OF_STOCK = 'OUT_OF_STOCK'// Hết hàng
}

@Entity('parts')
export class Part extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ name: 'part_code', unique: true, length: 50 })
  partCode: string; // VD: "PART-001", "PART-050"

  @Column({ length: 200 })
  name: string; // VD: "Vòng bi SKF 6205-2RSH", "Phớt ben thủy lực 80x100x12"

  @Column({ length: 100 })
  category: string; // VD: "Bạc đạn", "Phớt chắn dầu", "Dây curoa", "Thiết bị điện"

  @Column({ length: 50, default: 'Cái' })
  unit: string; // "Cái", "Bộ", "Lít", "Mét", "Cuộn"

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  unitPrice: number; // Đơn vị tiền tệ VNĐ

  @Column({ name: 'current_stock', type: 'int', default: 0 })
  currentStock: number; // Số lượng tồn kho thực tế

  @Column({ name: 'minimum_stock', type: 'int', default: 5 })
  minimumStock: number; // Ngưỡng tồn kho tối thiểu cảnh báo cần nhập

  @Column({ name: 'maximum_stock', type: 'int', nullable: true })
  maximumStock: number;

  @Column({ name: 'shelf_location', length: 100, nullable: true })
  shelfLocation: string; // Vị trí giá/kệ kho: "Kệ A - Ngăn 03"

  @Column({ name: 'supplier_info', length: 255, nullable: true })
  supplierInfo: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Quan hệ định mức gắn với máy (BOM)
  @OneToMany(() => AssetPartBom, (bom) => bom.part)
  bomLinks: AssetPartBom[];

  // Lịch sử xuất nhập kho
  @OneToMany(() => PartTransaction, (tx) => tx.part)
  transactions: PartTransaction[];
}
