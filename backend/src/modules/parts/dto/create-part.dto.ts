import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../entities/part-transaction.entity';

export class CreatePartDto {
  @IsNotEmpty({ message: 'Mã phụ tùng không được để trống' })
  @IsString()
  @MaxLength(50)
  partCode: string; // VD: PART-001

  @IsNotEmpty({ message: 'Tên phụ tùng không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNotEmpty({ message: 'Loại phụ tùng không được để trống' })
  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  unit?: string = 'Cái';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @IsOptional()
  @IsString()
  supplierInfo?: string;
}

export class AdjustStockDto {
  @IsNotEmpty()
  @IsEnum(TransactionType)
  transactionType: TransactionType; // IMPORT, EXPORT, ADJUSTMENT

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @IsUUID('4')
  performedById?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAssetPartBomDto {
  @IsNotEmpty({ message: 'assetId không được để trống' })
  @IsUUID('4')
  assetId: string;

  @IsNotEmpty({ message: 'partId không được để trống' })
  @IsUUID('4')
  partId: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  standardQuantity: number; // Định mức số lượng lắp trên máy

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  replacementIntervalHours?: number; // Chu kỳ giờ thay thế

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  replacementIntervalDays?: number;

  @IsOptional()
  isCritical?: boolean = false;

  @IsOptional()
  @IsString()
  installationPosition?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
