import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppBaseEntity } from '../../../common/base.entity';
import { Asset } from '../../assets/entities/asset.entity';

@Entity('locations')
export class Location extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  code: string; // VD: "LOC-FAC1", "LOC-WS-A", "LOC-LINE-01"

  @Column({ length: 150 })
  name: string; // VD: "Xưởng Sản Xuất A", "Dây Chuyền Dập 01"

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Location, (location) => location.children, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Location | null;

  @OneToMany(() => Location, (location) => location.parent)
  children: Location[];

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Asset, (asset) => asset.location)
  assets: Asset[];
}
