import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WorkOrderPriority, WorkOrderType } from "../entities/work-order.enums";

export class CreateWorkOrderDto {
  @ApiProperty({ format: "uuid", description: "UUID thiết bị còn sử dụng" })
  @IsUUID()
  assetId: string;

  @ApiProperty({ example: "Máy nén khí quá nhiệt", maxLength: 255 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({
    enum: WorkOrderType,
    default: WorkOrderType.CORRECTIVE,
  })
  @IsEnum(WorkOrderType)
  type: WorkOrderType = WorkOrderType.CORRECTIVE;

  @ApiPropertyOptional({
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
  })
  @IsEnum(WorkOrderPriority)
  priority: WorkOrderPriority = WorkOrderPriority.MEDIUM;

  @ApiPropertyOptional({
    example: "2026-11-11T08:00:00+07:00",
    description:
      "Bắt buộc với CORRECTIVE/EMERGENCY; ISO timestamp có múi giờ, không ở tương lai",
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  breakdownTime?: string;

  @ApiPropertyOptional({ example: "2026-11-11", format: "date" })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledStartDate?: string;

  @ApiPropertyOptional({ example: "2026-11-12", format: "date" })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledEndDate?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9999999999.99)
  estimatedCost?: number;
}
