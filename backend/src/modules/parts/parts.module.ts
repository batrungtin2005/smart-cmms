import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Part } from './entities/part.entity';
import { AssetPartBom } from './entities/asset-part-bom.entity';
import { PartTransaction } from './entities/part-transaction.entity';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Part, AssetPartBom, PartTransaction]),
  ],
  controllers: [PartsController],
  providers: [PartsService],
  exports: [PartsService, TypeOrmModule],
})
export class PartsModule {}
