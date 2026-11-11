import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../entities/part-transaction.entity';

export class QueryPartTransactionDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Trang hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Số lượng bản ghi trên một trang' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Lọc lịch sử biến động theo UUID của phụ tùng',
  })
  @IsOptional()
  @IsUUID('4')
  partId?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Lọc theo UUID của Lệnh công việc / Lệnh sản xuất',
  })
  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    example: TransactionType.EXPORT,
    description: 'Lọc theo loại giao dịch (IMPORT: Nhập kho, EXPORT: Xuất kho, ADJUSTMENT: Điều chỉnh)',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @ApiPropertyOptional({
    example: 'PXK-2026',
    description: 'Tìm kiếm theo mã chứng từ referenceCode hoặc ghi chú notes',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Ngày bắt đầu tìm kiếm (ISO Date YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Ngày kết thúc tìm kiếm (ISO Date YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}

