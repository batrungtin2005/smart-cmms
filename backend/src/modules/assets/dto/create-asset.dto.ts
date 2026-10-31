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
import { AssetCriticality, AssetStatus } from '../entities/asset.entity';

export class CreateAssetDto {
  @ApiProperty({
    example: 'AST-001',
    description: 'Mã định danh duy nhất của thiết bị (VD: AST-001, AST-300)',
  })
  @IsNotEmpty({ message: 'Mã tài sản không được để trống' })
  @IsString()
  @MaxLength(50)
  assetCode: string;

  @ApiProperty({
    example: 'Máy Ép Thủy Lực 500T',
    description: 'Tên gọi chi tiết của thiết bị',
  })
  @IsNotEmpty({ message: 'Tên tài sản không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example: 'Thủy lực',
    description: 'Danh mục thiết bị (Cơ khí, Thủy lực, Điện tự động, Khí nén)',
  })
  @IsNotEmpty({ message: 'Danh mục thiết bị không được để trống' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: 'Komatsu', description: 'Hãng sản xuất' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'PH-500-2024', description: 'Model máy' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 'SN-KOMATSU-998822', description: 'Số seri máy' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID vị trí phân xưởng đặt máy',
  })
  @IsOptional()
  @IsUUID('4', { message: 'locationId phải là UUID hợp lệ' })
  locationId?: string;

  @ApiPropertyOptional({
    enum: AssetStatus,
    default: AssetStatus.OPERATIONAL,
    description: 'Tình trạng hiện tại của máy',
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({
    enum: AssetCriticality,
    default: AssetCriticality.MEDIUM,
    description: 'Mức độ quan trọng đối với dây chuyền sản xuất',
  })
  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @ApiPropertyOptional({ example: '2024-01-15', description: 'Ngày lắp đặt' })
  @IsOptional()
  installDate?: Date;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Ngày hết hạn bảo hành' })
  @IsOptional()
  warrantyExpiryDate?: Date;

  @ApiPropertyOptional({
    example: 1250.5,
    description: 'Số giờ máy đã hoạt động tích lũy (Operating Hours)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operatingHours?: number;

  @ApiPropertyOptional({
    example: { power_kw: 45, max_pressure_bar: 300, oil_capacity_liters: 150 },
    description: 'Thông số kỹ thuật mở rộng dưới dạng JSON',
  })
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'https://cdn.zentech.vn/assets/ast-001.jpg',
    description: 'Hình ảnh thiết bị',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional({ example: 'Máy Ép Thủy Lực 500T (Nâng cấp)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Thủy lực' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'Komatsu' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'PH-500-REV2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 'SN-KOMATSU-998822' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCriticality })
  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @ApiPropertyOptional({ example: 1500.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operatingHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateAssetStatusDto {
  @ApiProperty({
    enum: AssetStatus,
    example: AssetStatus.MAINTENANCE,
    description: 'Trạng thái mới cần chuyển đổi của máy',
  })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(AssetStatus, {
    message: 'Trạng thái phải là OPERATIONAL, DOWN, MAINTENANCE hoặc DECOMMISSIONED',
  })
  status: AssetStatus;

  @ApiPropertyOptional({
    example: 'Chuyển sang bảo trì định kỳ 1000 giờ máy chạy',
    description: 'Lý do cập nhật trạng thái',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryAssetDto {
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
    example: 'AST-001',
    description: 'Tìm kiếm theo mã tài sản, tên thiết bị hoặc số seri',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AssetStatus,
    description: 'Lọc theo trạng thái vận hành',
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Lọc theo vị trí xưởng',
  })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @ApiPropertyOptional({ example: 'Thủy lực', description: 'Lọc theo nhóm thiết bị' })
  @IsOptional()
  @IsString()
  category?: string;
}
