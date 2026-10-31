import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Part } from './part.entity';
import { User } from '../../auth/entities/user.entity';

export enum TransactionType {
  IMPORT = 'IMPORT',         // Nhập kho vật tư
  EXPORT = 'EXPORT',         // Xuất kho đi sửa chữa máy
  ADJUSTMENT = 'ADJUSTMENT'  // Điều chỉnh sau kiểm kê kho
}

@Entity('part_transactions')
export class PartTransaction extends AppBaseEntity {
  @Index()
  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part, (part) => part.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Index()
  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId: string | null;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'int' })
  quantity: number; // Dương khi nhập, dương khi ghi nhận xuất

  @Column({ name: 'stock_before', type: 'int', default: 0 })
  stockBefore: number;

  @Column({ name: 'stock_after', type: 'int', default: 0 })
  stockAfter: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  unitPrice: number;

  @Column({ name: 'reference_code', length: 100, nullable: true })
  referenceCode: string; // Số hóa đơn, mã phiếu WO, hoặc biên bản kiểm kê

  @Column({ name: 'performed_by_id', type: 'uuid', nullable: true })
  performedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User | null;

  @Column({ length: 255, nullable: true })
  notes: string;
}
