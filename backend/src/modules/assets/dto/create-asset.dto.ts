import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { AssetStatus } from '../entities/asset.entity';

export class CreateAssetDto {
  @ApiProperty({ example: 'AST-001', description: 'Mã thiết bị (duy nhất)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  asset_code: string;

  @ApiProperty({ example: 'Máy tiện CNC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Máy cắt kim loại' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'Fanuc' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'CNC-200X' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 'SN-202401-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  serial_number?: string;

  @ApiPropertyOptional({ description: 'UUID của vị trí (location_id)' })
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @ApiPropertyOptional({ enum: AssetStatus, default: AssetStatus.OPERATIONAL })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @ApiPropertyOptional({ example: '2022-01-15' })
  @IsDateString()
  @IsOptional()
  install_date?: string;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsDateString()
  @IsOptional()
  warranty_expiry_date?: string;

  @ApiPropertyOptional({ example: 1500.5, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  operating_hours?: number;
}
