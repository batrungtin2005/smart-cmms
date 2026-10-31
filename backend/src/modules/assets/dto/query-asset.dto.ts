import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
import { AssetStatus } from '../entities/asset.entity';

export class QueryAssetDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã hoặc tên thiết bị' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: AssetStatus, description: 'Lọc theo trạng thái' })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @ApiPropertyOptional({ description: 'Lọc theo UUID vị trí' })
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @ApiPropertyOptional({ default: 1, description: 'Trang hiện tại' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Số bản ghi mỗi trang' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
