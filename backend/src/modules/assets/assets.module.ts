import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetHistory } from '../history/entities/asset-history.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, AssetHistory])],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService, TypeOrmModule],
})
export class AssetsModule {}
