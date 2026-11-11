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
  @ApiProperty({ example: 'PART-001', description: 'Mã phụ tùng duy nhất (VD: PART-001, PART-050)' })
  @IsNotEmpty({ message: 'Mã phụ tùng không được để trống' })
  @IsString()
  @MaxLength(50)
  partCode: string;

  @ApiProperty({ example: 'Vòng bi SKF 6205-2RSH', description: 'Tên chi tiết phụ tùng' })
  @IsNotEmpty({ message: 'Tên phụ tùng không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Bạc đạn', description: 'Loại / Danh mục phụ tùng' })
  @IsNotEmpty({ message: 'Loại phụ tùng không được để trống' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: 'Cái', default: 'Cái', description: 'Đơn vị tính (Cái, Bộ, Lít, Mét, Cuộn)' })
  @IsOptional()
  @IsString()
  unit?: string = 'Cái';

  @ApiPropertyOptional({ example: 450000, description: 'Đơn giá vốn nhập kho (VNĐ)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number = 0;

  @ApiPropertyOptional({ example: 20, description: 'Số lượng tồn kho ban đầu (currentStock / quantity_on_hand)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock?: number = 0;

  @ApiPropertyOptional({ example: 20, description: 'Bí danh số lượng tồn kho (quantity_on_hand)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityOnHand?: number;

  @ApiPropertyOptional({ example: 5, description: 'Ngưỡng tồn kho tối thiểu cảnh báo cần nhập thêm (minimum_stock)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number = 5;

  @ApiPropertyOptional({ example: 100, description: 'Mức tồn kho tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumStock?: number;

  @ApiPropertyOptional({ example: 'Kệ B - Tầng 2 - Ngăn 03', description: 'Vị trí giá / kệ trong kho' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @ApiPropertyOptional({ example: 'Công ty TNHH Vòng Bi SKF Việt Nam', description: 'Nhà cung cấp / đối tác' })
  @IsOptional()
  @IsString()
  supplierInfo?: string;
}

export class UpdatePartDto {
  @ApiPropertyOptional({ example: 'Vòng bi SKF 6205-2RSH (Chính hãng)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Bạc đạn' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'Cái' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 480000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 5, description: 'Ngưỡng tồn kho tối thiểu (minimum_stock)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumStock?: number;

  @ApiPropertyOptional({ example: 'Kệ A - Tầng 1 - Ngăn 02' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelfLocation?: string;

  @ApiPropertyOptional({ example: 'Nhà phân phối SKF Miền Nam' })
  @IsOptional()
  @IsString()
  supplierInfo?: string;
}

export class QueryPartDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Số bản ghi trên 1 trang' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'SKF',
    description: 'Tìm kiếm theo mã phụ tùng, tên, kệ kho hoặc nhà cung cấp',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Bạc đạn', description: 'Lọc theo danh mục phụ tùng' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Chỉ lọc các phụ tùng sắp hết hàng (currentStock <= minimumStock)',
  })
  @IsOptional()
  lowStockOnly?: boolean | string;
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
