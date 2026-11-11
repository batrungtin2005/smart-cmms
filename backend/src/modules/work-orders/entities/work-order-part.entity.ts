import { Check, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Part } from '../../parts/entities/part.entity';
import { WorkOrder } from './work-order.entity';

@Entity('work_order_parts')
@Unique('uq_wo_part', ['workOrderId', 'partId'])
@Check('quantity_used > 0')
export class WorkOrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  @ManyToOne(() => WorkOrder, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Column({ name: 'quantity_used', type: 'int' })
  quantityUsed: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, asExpression: 'quantity_used * unit_price', generatedType: 'STORED', nullable: true, insert: false, update: false })
  subtotal: number;

  @Column({ length: 255, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
