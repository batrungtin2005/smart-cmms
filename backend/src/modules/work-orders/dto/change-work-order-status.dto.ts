import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { WorkOrderStatus } from "../entities/work-order.enums";

export class ChangeWorkOrderStatusDto {
  @ApiProperty({ enum: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"] })
  @IsIn([
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.ON_HOLD,
    WorkOrderStatus.CANCELLED,
  ])
  status: WorkOrderStatus;

  @ApiPropertyOptional({
    description: "Bắt buộc khi tạm dừng hoặc hủy",
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf(
    (dto) =>
      dto.status !== WorkOrderStatus.IN_PROGRESS || dto.reason !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason?: string;
}
