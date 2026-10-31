import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetHistory } from './entities/asset-history.entity';
import { Asset } from '../assets/entities/asset.entity';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssetHistory, Asset])],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService, TypeOrmModule],
})
export class HistoryModule {}
