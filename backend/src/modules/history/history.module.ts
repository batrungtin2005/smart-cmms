import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetHistory } from './entities/asset-history.entity';
import { Asset } from '../assets/entities/asset.entity';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { AssetEventBus } from './events/asset-event-bus';
import { AssetHistoryListener } from './listeners/asset-history.listener';

@Module({
  imports: [TypeOrmModule.forFeature([AssetHistory, Asset])],
  controllers: [HistoryController],
  providers: [
    HistoryService,
    AssetEventBus,
    AssetHistoryListener,
  ],
  exports: [
    HistoryService,
    AssetEventBus,
    TypeOrmModule,
  ],
})
export class AssetHistoryModule {}

// Xuất tương thích ngược với các module khác đang import HistoryModule
export { AssetHistoryModule as HistoryModule };
