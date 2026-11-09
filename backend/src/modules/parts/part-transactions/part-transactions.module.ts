import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Part } from '../entities/part.entity';
import { PartTransaction } from '../entities/part-transaction.entity';
import { PartTransactionsService } from './part-transactions.service';
import { PartTransactionsController } from './part-transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Part, PartTransaction])],
  controllers: [PartTransactionsController],
  providers: [PartTransactionsService],
  exports: [PartTransactionsService, TypeOrmModule],
})
export class PartTransactionModule {}

// Alias xuất tương thích
export { PartTransactionModule as PartTransactionsModule };

