import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({
    example: 'LOC-WS-A',
    description: 'Mã định danh duy nhất của vị trí (VD: LOC-FAC1, LOC-WS-A, LOC-LINE-01)',
  })
  @IsNotEmpty({ message: 'Mã vị trí không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    example: 'Phân Xưởng Gia Công Cơ Khí CNC',
    description: 'Tên hiển thị của vị trí/nhà xưởng/dây chuyền',
  })
  @IsNotEmpty({ message: 'Tên vị trí không được để trống' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    example: 'a0000000-0000-0000-0000-000000000001',
    description: 'UUID vị trí cấp cha (để trống nếu là cấp cao nhất - Nhà máy/Khu liên hợp)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'parentId phải là UUID hợp lệ' })
  parentId?: string;

  @ApiPropertyOptional({
    example: 'Khu vực đặt các máy phay CNC 5 trục và máy tiện tự động',
    description: 'Mô tả chi tiết về vị trí này',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateLocationDto {
  @ApiPropertyOptional({ example: 'LOC-WS-A-REV1', description: 'Mã vị trí mới' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'Phân Xưởng Cơ Khí Chính Xác', description: 'Tên vị trí mới' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    example: 'a0000000-0000-0000-0000-000000000001',
    description: 'UUID vị trí cấp cha mới',
  })
  @IsOptional()
  @IsUUID('4', { message: 'parentId phải là UUID hợp lệ' })
  parentId?: string;

  @ApiPropertyOptional({ example: 'Cập nhật lại mô tả vị trí xưởng', description: 'Mô tả' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
