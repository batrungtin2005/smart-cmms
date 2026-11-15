import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  AssetMaintenanceEvent,
  AssetRepairEvent,
  AssetReplacementEvent,
} from './asset-history.events';

export const ASSET_EVENTS = {
  MAINTENANCE: 'asset.event.maintenance',
  REPAIR: 'asset.event.repair',
  REPLACEMENT: 'asset.event.replacement',
} as const;

@Injectable()
export class AssetEventBus {
  private readonly logger = new Logger(AssetEventBus.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    // Tăng số lượng listener tối đa để không bị cảnh báo memory leak khi mở rộng
    this.emitter.setMaxListeners(50);
  }

  /**
   * Phát sự kiện Bảo trì thiết bị (Maintenance)
   */
  emitMaintenance(event: AssetMaintenanceEvent): boolean {
    this.logger.log(
      `[EVENT EMIT] ${ASSET_EVENTS.MAINTENANCE} cho Asset ID: ${event.assetId} - "${event.title}"`,
    );
    return this.emitter.emit(ASSET_EVENTS.MAINTENANCE, event);
  }

  /**
   * Phát sự kiện Sửa chữa thiết bị (Repair)
   */
  emitRepair(event: AssetRepairEvent): boolean {
    this.logger.log(
      `[EVENT EMIT] ${ASSET_EVENTS.REPAIR} cho Asset ID: ${event.assetId} - "${event.title}"`,
    );
    return this.emitter.emit(ASSET_EVENTS.REPAIR, event);
  }

  /**
   * Phát sự kiện Thay thế phụ tùng thiết bị (Replacement)
   */
  emitReplacement(event: AssetReplacementEvent): boolean {
    this.logger.log(
      `[EVENT EMIT] ${ASSET_EVENTS.REPLACEMENT} cho Asset ID: ${event.assetId} - "${event.title}"`,
    );
    return this.emitter.emit(ASSET_EVENTS.REPLACEMENT, event);
  }

  /**
   * Lắng nghe sự kiện theo tên
   */
  on(eventName: string, listener: (...args: any[]) => void): void {
    this.emitter.on(eventName, listener);
  }

  /**
   * Hủy lắng nghe sự kiện
   */
  off(eventName: string, listener: (...args: any[]) => void): void {
    this.emitter.off(eventName, listener);
  }
}

