import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType,
} from "../entities/work-order.enums";

export class MyWorkOrdersQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    description: "Tìm theo mã hoặc tiêu đề phiếu",
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: WorkOrderPriority })
  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ enum: WorkOrderType })
  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({
    format: "date-time",
    description: "Thời điểm tạo từ (bao gồm), có múi giờ",
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  createdFrom?: string;

  @ApiPropertyOptional({
    format: "date-time",
    description: "Thời điểm tạo đến (bao gồm), có múi giờ",
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  createdTo?: string;
}

export class QueryWorkOrdersDto extends MyWorkOrdersQueryDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Lọc theo KTV được giao; chỉ dùng cho danh sách quản lý",
  })
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;
}
