import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceEventType } from '../entities/asset-history.entity';

export class PartItemDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID('4')
  partId: string;

  @ApiProperty({ example: 'PART-001' })
  @IsString()
  partCode: string;

  @ApiProperty({ example: 'Vòng bi SKF 6205' })
  @IsString()
  partName: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 450000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 900000 })
  @IsNumber()
  @Min(0)
  totalPrice: number;
}

export class EmitMaintenanceEventDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'UUID của thiết bị' })
  @IsNotEmpty()
  @IsUUID('4')
  assetId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @ApiProperty({ example: 'Bảo dưỡng định kỳ 2000 giờ máy phay CNC 5 trục' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Bơm mỡ trục chính, kiểm tra độ rơ vít me bi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MaintenanceEventType, default: MaintenanceEventType.PREVENTIVE_MAINTENANCE })
  @IsOptional()
  @IsEnum(MaintenanceEventType)
  eventType?: MaintenanceEventType = MaintenanceEventType.PREVENTIVE_MAINTENANCE;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  performedById?: string;

  @ApiPropertyOptional({ example: 'Đã siết lực và hiệu chuẩn trục Z' })
  @IsOptional()
  @IsString()
  actionTaken?: string;

  @ApiPropertyOptional({ example: 250000, description: 'Chi phí nhân công' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costLabor?: number;

  @ApiPropertyOptional({ type: [PartItemDto] })
  @IsOptional()
  @IsArray()
  partsReplaced?: PartItemDto[];
}

export class EmitRepairEventDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'UUID của thiết bị' })
  @IsNotEmpty()
  @IsUUID('4')
  assetId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @ApiProperty({ example: 'Sửa chữa kẹt xi lanh thủy lực máy ép Komatsu' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Áp suất tụt đột ngột, dầu thủy lực rò rỉ tại phớt chính' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Rách phớt ben thủy lực do cặn bẩn dầu' })
  @IsOptional()
  @IsString()
  failureCause?: string;

  @ApiPropertyOptional({ example: 'Thay bộ phớt mới, súc rửa bình dầu thủy lực' })
  @IsOptional()
  @IsString()
  actionTaken?: string;

  @ApiPropertyOptional({ example: 1.5, description: 'Thời gian sửa chữa thực tế (giờ) phục vụ MTTR' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualRepairTimeHours?: number;

  @ApiPropertyOptional({ example: 2.0, description: 'Thời gian dừng máy (downtime hours)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  downtimeHours?: number;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  performedById?: string;

  @ApiPropertyOptional({ type: [PartItemDto] })
  @IsOptional()
  @IsArray()
  partsReplaced?: PartItemDto[];

  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costLabor?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  isFailureCounted?: boolean = true;
}

export class EmitReplacementEventDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'UUID của thiết bị' })
  @IsNotEmpty()
  @IsUUID('4')
  assetId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @ApiProperty({ example: 'Thay thế định kỳ vòng bi SKF 6309 cho động cơ quạt hút' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Vòng bi kêu to sau 4500 giờ vận hành' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Hao mòn cơ khí tự nhiên' })
  @IsOptional()
  @IsString()
  replacementReason?: string;

  @ApiPropertyOptional({ example: 'Tháo lắp puly và ép vòng bi mới bằng cảo thủy lực' })
  @IsOptional()
  @IsString()
  actionTaken?: string;

  @ApiProperty({ type: [PartItemDto], description: 'Danh sách linh kiện được thay thế' })
  @IsNotEmpty()
  @IsArray()
  partsReplaced: PartItemDto[];

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID('4')
  performedById?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costLabor?: number;
}

