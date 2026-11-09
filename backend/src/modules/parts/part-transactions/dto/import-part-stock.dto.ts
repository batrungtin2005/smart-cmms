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

export class ImportPartStockDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID của phụ tùng cần nhập kho',
  })
  @IsNotEmpty({ message: 'partId không được để trống' })
  @IsUUID('4', { message: 'partId phải là định dạng UUID v4' })
  partId: string;

  @ApiProperty({
    example: 50,
    description: 'Số lượng phụ tùng nhập kho đầu vào',
  })
  @IsNotEmpty({ message: 'Số lượng nhập không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Số lượng nhập phải là số' })
  @Min(1, { message: 'Số lượng nhập tối thiểu phải là 1' })
  quantity: number;

  @ApiPropertyOptional({
    example: 450000,
    description: 'Đơn giá nhập kho (VNĐ) để cập nhật giá vốn gần nhất',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Đơn giá không được âm' })
  unitPrice?: number;

  @ApiPropertyOptional({
    example: 'PNK-2026-0012',
    description: 'Mã số phiếu nhập kho, số hóa đơn hoặc mã đơn hàng mua (PO)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceCode?: string;

  @ApiPropertyOptional({
    example: 'Công ty Cổ phần Vòng Bi SKF Việt Nam',
    description: 'Tên nhà cung cấp / đối tác cung ứng vật tư',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierInfo?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID người thực hiện / thủ kho lập phiếu nhập',
  })
  @IsOptional()
  @IsUUID('4', { message: 'performedById phải là UUID hợp lệ' })
  performedById?: string;

  @ApiPropertyOptional({
    example: 'Nhập lô bạc đạn mới theo kế hoạch bảo dưỡng quý 4',
    description: 'Ghi chú chi tiết cho đợt nhập kho này',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

