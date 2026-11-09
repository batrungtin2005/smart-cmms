import {
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

export class ExportPartStockDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID của phụ tùng cần xuất kho',
  })
  @IsNotEmpty({ message: 'partId không được để trống' })
  @IsUUID('4', { message: 'partId phải là định dạng UUID v4' })
  partId: string;

  @ApiProperty({
    example: 2,
    description: 'Số lượng phụ tùng cần xuất',
  })
  @IsNotEmpty({ message: 'Số lượng xuất không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Số lượng xuất phải là số' })
  @Min(1, { message: 'Số lượng xuất tối thiểu phải là 1' })
  quantity: number;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID của Lệnh làm việc / Lệnh bảo trì (Work Order) nếu có',
  })
  @IsOptional()
  @IsUUID('4', { message: 'workOrderId phải là định dạng UUID v4' })
  workOrderId?: string;

  @ApiPropertyOptional({
    example: 'LSX-2026-001',
    description: 'Mã Lệnh sản xuất (Production Order Code) hoặc Lệnh chế tạo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productionOrderCode?: string;

  @ApiPropertyOptional({
    example: 'PXK-2026-0089',
    description: 'Mã phiếu xuất kho / Mã tham chiếu giao dịch xuất',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceCode?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID của thiết bị / tài sản tiếp nhận phụ tùng thay thế',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assetId phải là định dạng UUID v4' })
  assetId?: string;

  @ApiPropertyOptional({
    example: 'Xuất phụ tùng phục vụ Lệnh sản xuất chuyền cán nguội ca 1',
    description: 'Lý do xuất kho (Lệnh sản xuất, thay thế khẩn cấp, bảo dưỡng định kỳ)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID người thực hiện xuất / kỹ thuật viên tiếp nhận',
  })
  @IsOptional()
  @IsUUID('4', { message: 'performedById phải là định dạng UUID v4' })
  performedById?: string;

  @ApiPropertyOptional({
    example: 'Kiểm tra kỹ thông số kích thước trước khi bàn giao cho bộ phận sản xuất',
    description: 'Ghi chú bổ sung',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

