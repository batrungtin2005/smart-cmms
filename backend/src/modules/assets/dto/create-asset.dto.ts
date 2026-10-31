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
import { AssetCriticality, AssetStatus } from '../entities/asset.entity';

export class CreateAssetDto {
  @IsNotEmpty({ message: 'Mã tài sản không được để trống' })
  @IsString()
  @MaxLength(50)
  assetCode: string; // VD: AST-001

  @IsNotEmpty({ message: 'Tên tài sản không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNotEmpty({ message: 'Danh mục thiết bị không được để trống' })
  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsUUID('4', { message: 'locationId phải là UUID hợp lệ' })
  locationId?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  installDate?: Date;

  @IsOptional()
  warrantyExpiryDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operatingHours?: number;

  @IsOptional()
  specifications?: Record<string, any>;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operatingHours?: number;

  @IsOptional()
  specifications?: Record<string, any>;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class QueryAssetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string; // Tìm theo mã assetCode hoặc tên name

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
