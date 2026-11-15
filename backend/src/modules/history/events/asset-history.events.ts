import { MaintenanceEventType } from '../entities/asset-history.entity';

export interface PartReplacementItem {
  partId: string;
  partCode: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export abstract class BaseAssetHistoryEvent {
  assetId: string;
  workOrderId?: string | null;
  performedById?: string | null;
  title: string;
  description?: string;
  timestamp?: Date;
  costLabor?: number;
  costParts?: number;
  totalCost?: number;
  partsReplaced?: PartReplacementItem[];
  notes?: string;

  constructor(partial: Partial<BaseAssetHistoryEvent>) {
    Object.assign(this, partial);
    this.timestamp = this.timestamp || new Date();
  }
}

/**
 * 1. SỰ KIỆN BẢO TRÌ (Maintenance Event):
 * Phát sinh khi thiết bị được bảo dưỡng định kỳ, tra dầu mỡ, hiệu chuẩn, hoặc kiểm tra kỹ thuật.
 */
export class AssetMaintenanceEvent extends BaseAssetHistoryEvent {
  eventType: MaintenanceEventType = MaintenanceEventType.PREVENTIVE_MAINTENANCE;
  maintenanceScheduleId?: string;
  actionTaken?: string;

  constructor(partial: Partial<AssetMaintenanceEvent>) {
    super(partial);
    if (partial.eventType) {
      this.eventType = partial.eventType;
    }
  }
}

/**
 * 2. SỰ KIỆN SỬA CHỮA (Repair Event):
 * Phát sinh khi thiết bị gặp sự cố hỏng hóc hoặc được sửa chữa phục hồi.
 */
export class AssetRepairEvent extends BaseAssetHistoryEvent {
  eventType: MaintenanceEventType = MaintenanceEventType.CORRECTIVE_REPAIR;
  breakdownTime?: Date;
  repairStartTime?: Date;
  repairEndTime?: Date;
  downtimeHours?: number;
  actualRepairTimeHours?: number;
  operatingHoursAtFailure?: number;
  failureCause?: string;
  actionTaken?: string;
  isFailureCounted?: boolean;

  constructor(partial: Partial<AssetRepairEvent>) {
    super(partial);
    if (partial.eventType) {
      this.eventType = partial.eventType;
    }
  }
}

/**
 * 3. SỰ KIỆN THAY THẾ PHỤ TÙNG (Replacement Event):
 * Phát sinh khi một hoặc nhiều linh kiện, phụ tùng của thiết bị được thay mới từ kho.
 */
export class AssetReplacementEvent extends BaseAssetHistoryEvent {
  eventType: MaintenanceEventType = MaintenanceEventType.PART_REPLACEMENT;
  actionTaken?: string;
  replacementReason?: string;

  constructor(partial: Partial<AssetReplacementEvent>) {
    super(partial);
    if (partial.eventType) {
      this.eventType = partial.eventType;
    }
  }
}

