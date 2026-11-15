import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  AssetEventBus,
  ASSET_EVENTS,
  AssetMaintenanceEvent,
  AssetRepairEvent,
  AssetReplacementEvent,
} from '../events';
import { HistoryService } from '../history.service';

@Injectable()
export class AssetHistoryListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssetHistoryListener.name);

  constructor(
    private readonly eventBus: AssetEventBus,
    private readonly historyService: HistoryService,
  ) {}

  onModuleInit() {
    this.logger.log('Đang đăng ký lắng nghe các sự kiện Asset Event Bus...');

    this.eventBus.on(ASSET_EVENTS.MAINTENANCE, this.handleMaintenanceEvent.bind(this));
    this.eventBus.on(ASSET_EVENTS.REPAIR, this.handleRepairEvent.bind(this));
    this.eventBus.on(ASSET_EVENTS.REPLACEMENT, this.handleReplacementEvent.bind(this));

    this.logger.log('Đã kích hoạt thành công AssetHistoryListener!');
  }

  onModuleDestroy() {
    this.eventBus.off(ASSET_EVENTS.MAINTENANCE, this.handleMaintenanceEvent.bind(this));
    this.eventBus.off(ASSET_EVENTS.REPAIR, this.handleRepairEvent.bind(this));
    this.eventBus.off(ASSET_EVENTS.REPLACEMENT, this.handleReplacementEvent.bind(this));
  }

  /**
   * Xử lý Sự kiện Bảo trì (Maintenance)
   * RÀNG BUỘC: CHỈ ghi nhận lịch sử chi tiết, TUYỆT ĐỐI KHÔNG sửa status của Asset.
   */
  async handleMaintenanceEvent(event: AssetMaintenanceEvent) {
    try {
      this.logger.log(
        `[AUDIT LOG] Ghi nhận sự kiện BẢO TRÌ cho thiết bị ID: ${event.assetId} - "${event.title}"`,
      );
      await this.historyService.recordEventHistory({
        assetId: event.assetId,
        workOrderId: event.workOrderId,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        performedById: event.performedById,
        partsReplaced: event.partsReplaced || [],
        costParts: event.costParts || 0,
        costLabor: event.costLabor || 0,
        totalCost: event.totalCost || (event.costParts || 0) + (event.costLabor || 0),
        actionTaken: event.actionTaken,
      });
    } catch (error: any) {
      this.logger.error(
        `Lỗi khi ghi nhận sự kiện bảo trì cho Asset ${event.assetId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Xử lý Sự kiện Sửa chữa (Repair)
   * RÀNG BUỘC: CHỈ ghi nhận lịch sử chi tiết, TUYỆT ĐỐI KHÔNG sửa status của Asset.
   */
  async handleRepairEvent(event: AssetRepairEvent) {
    try {
      this.logger.log(
        `[AUDIT LOG] Ghi nhận sự kiện SỬA CHỮA cho thiết bị ID: ${event.assetId} - "${event.title}"`,
      );
      await this.historyService.recordEventHistory({
        assetId: event.assetId,
        workOrderId: event.workOrderId,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        performedById: event.performedById,
        partsReplaced: event.partsReplaced || [],
        costParts: event.costParts || 0,
        costLabor: event.costLabor || 0,
        totalCost: event.totalCost || (event.costParts || 0) + (event.costLabor || 0),
        breakdownTime: event.breakdownTime,
        repairStartTime: event.repairStartTime,
        repairEndTime: event.repairEndTime,
        downtimeHours: event.downtimeHours || 0,
        actualRepairTimeHours: event.actualRepairTimeHours || 0,
        operatingHoursAtFailure: event.operatingHoursAtFailure,
        failureCause: event.failureCause,
        actionTaken: event.actionTaken,
        isFailureCounted: event.isFailureCounted,
      });
    } catch (error: any) {
      this.logger.error(
        `Lỗi khi ghi nhận sự kiện sửa chữa cho Asset ${event.assetId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Xử lý Sự kiện Thay thế Phụ tùng (Replacement)
   * RÀNG BUỘC: CHỈ ghi nhận lịch sử chi tiết, TUYỆT ĐỐI KHÔNG sửa status của Asset.
   */
  async handleReplacementEvent(event: AssetReplacementEvent) {
    try {
      this.logger.log(
        `[AUDIT LOG] Ghi nhận sự kiện THAY THẾ PHỤ TÙNG cho thiết bị ID: ${event.assetId} - "${event.title}"`,
      );
      await this.historyService.recordEventHistory({
        assetId: event.assetId,
        workOrderId: event.workOrderId,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        performedById: event.performedById,
        partsReplaced: event.partsReplaced || [],
        costParts: event.costParts || 0,
        costLabor: event.costLabor || 0,
        totalCost: event.totalCost || (event.costParts || 0) + (event.costLabor || 0),
        failureCause: event.replacementReason,
        actionTaken: event.actionTaken,
      });
    } catch (error: any) {
      this.logger.error(
        `Lỗi khi ghi nhận sự kiện thay thế linh kiện cho Asset ${event.assetId}: ${error.message}`,
        error.stack,
      );
    }
  }
}

