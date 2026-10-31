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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../entities/part-transaction.entity';
import { MaintenanceEventType } from '../../history/entities/asset-history.entity';

export class CreatePartDto {
  @ApiProperty({ example: 'PART-001', description: 'Mã phụ tùng duy nhất' })
  @IsNotEmpty({ message: 'Mã phụ tùng không được để trống' })
  @IsString()
  @MaxLength(50)
  partCode: string;

  @ApiProperty({ example: 'Vòng bi SKF 6205-2RSH', description: 'Tên phụ tùng' })
  @IsNotEmpty({ message: 'Tên phụ tùng không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Bạc đạn', description: 'Loại phụ tùng' })
  @IsNotEmpty({ message: 'Loại phụ tùng không được để trống' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: 'Cái', default: 'Cái' })
  @IsOptional()
  @IsString()
  unit?: string = 'Cái';

  @ApiPropertyOptional({ example: 450000, description: 'Đơn giá vốn (VNĐ)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number = 0;

  @ApiPropertyOptional({ example: 20, description: 'Tồn kho ban đầu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock?: number = 0;

  @ApiPropertyOptional({ example: 5, description: 'Ngưỡng tồn kho tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number = 5;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumStock?: number;

  @ApiPropertyOptional({ example: 'Kệ B - Ngăn 03' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @ApiPropertyOptional({ example: 'Công ty Vòng Bi SKF Việt Nam' })
  @IsOptional()
  @IsString()
  supplierInfo?: string;
}

export class AdjustStockDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.IMPORT })
  @IsNotEmpty()
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty({ example: 10, description: 'Số lượng biến động' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @ApiPropertyOptional({ example: 'INV-2026-001' })
  @IsOptional()
  @IsString()
  referenceCode?: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  performedById?: string;

  @ApiPropertyOptional({ example: 'Nhập bổ sung kho phụ tùng' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAssetPartBomDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsNotEmpty({ message: 'assetId không được để trống' })
  @IsUUID('4')
  assetId: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsNotEmpty({ message: 'partId không được để trống' })
  @IsUUID('4')
  partId: string;

  @ApiProperty({ example: 2, description: 'Định mức số lượng cần trên 1 thiết bị' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  standardQuantity: number;

  @ApiPropertyOptional({ example: 2000, description: 'Chu kỳ giờ máy chạy phải thay định kỳ' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  replacementIntervalHours?: number;

  @ApiPropertyOptional({ example: 180, description: 'Chu kỳ ngày' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  replacementIntervalDays?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  isCritical?: boolean = false;

  @ApiPropertyOptional({ example: 'Cụm puly động cơ chính' })
  @IsOptional()
  @IsString()
  installationPosition?: string;

  @ApiPropertyOptional({ example: 'Cần siết lực 120Nm khi lắp' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ================= DTO XUẤT PHỤ TÙNG RA SỬA CHỮA THIẾT BỊ =================
export class IssuePartToAssetDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID của phụ tùng cần xuất kho',
  })
  @IsNotEmpty({ message: 'partId không được để trống' })
  @IsUUID('4', { message: 'partId phải là UUID hợp lệ' })
  partId: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID của thiết bị được lắp/thay thế phụ tùng',
  })
  @IsNotEmpty({ message: 'assetId không được để trống' })
  @IsUUID('4', { message: 'assetId phải là UUID hợp lệ' })
  assetId: string;

  @ApiProperty({
    example: 2,
    description: 'Số lượng phụ tùng xuất dùng',
  })
  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Số lượng xuất kho tối thiểu là 1' })
  quantity: number;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID phiếu công việc (Work Order) nếu có',
  })
  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID kỹ thuật viên thực hiện',
  })
  @IsOptional()
  @IsUUID('4')
  performedById?: string;

  @ApiPropertyOptional({
    enum: MaintenanceEventType,
    default: MaintenanceEventType.PART_REPLACEMENT,
    example: MaintenanceEventType.PART_REPLACEMENT,
    description: 'Loại sự kiện (PART_REPLACEMENT, CORRECTIVE_REPAIR, PREVENTIVE_MAINTENANCE)',
  })
  @IsOptional()
  @IsEnum(MaintenanceEventType)
  eventType?: MaintenanceEventType;

  @ApiPropertyOptional({
    example: 'Thay 2 vòng bi SKF cho cụm puly do tiếng ồn lớn và quá nhiệt',
    description: 'Lý do hoặc mô tả chi tiết công việc thay thế',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: 1.5,
    description: 'Thời gian sửa chữa thực tế (giờ) phục vụ tính MTTR',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualRepairTimeHours?: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Thời gian dừng máy (downtime hours)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  downtimeHours?: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Chi phí nhân công thực hiện (VNĐ)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborCost?: number;
}
