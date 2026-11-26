import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from "class-validator";
import { ScheduleType } from "../entities/maintenance-schedule.entity";
import { WorkOrderPriority } from "../../work-orders/entities/work-order.enums";

export class ScheduleDto {
  @ApiProperty() @IsUUID() assetId: string;
  @ApiProperty() @Transform(({value}) => typeof value === "string" ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(255) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @ApiProperty({ enum: ScheduleType }) @IsEnum(ScheduleType) scheduleType: ScheduleType;
  @ApiPropertyOptional({ enum: WorkOrderPriority }) @IsEnum(WorkOrderPriority) priority = WorkOrderPriority.MEDIUM;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(36500) intervalDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString({strict:true}) @Matches(/^\d{4}-\d{2}-\d{2}$/) nextDueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0.01) @Max(99999999.99) intervalHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(99999999.99) nextDueHours?: number;
  @ApiPropertyOptional({enum:["TEMPERATURE","VIBRATION"]}) @IsOptional() @IsIn(["TEMPERATURE","VIBRATION"]) conditionParameter?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber({maxDecimalPlaces:4}) @Min(-999999.9999) @Max(999999.9999) conditionThreshold?: number;
  @ApiPropertyOptional({enum:[">",">="]}) @IsOptional() @IsIn([">",">="]) conditionOperator?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(525600) maxReadingAgeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(525600) cooldownMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) measurementLocation?: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(365) advanceNoticeDays = 3;
}
export class UpdateScheduleDto extends ScheduleDto {
  @ApiProperty({description:"Revision from the last GET, for optimistic concurrency"}) @IsInt() @Min(1) expectedRevision: number;
}
export class ScheduleActivationDto {
  @ApiProperty() @IsBoolean() isActive: boolean;
  @ApiProperty() @IsInt() @Min(1) expectedRevision: number;
}
export class PmPageDto {
  @ApiPropertyOptional({default:1}) @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @ApiPropertyOptional({default:20}) @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class QuerySchedulesDto extends PmPageDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() assetId?: string;
  @ApiPropertyOptional({enum:ScheduleType}) @IsOptional() @IsEnum(ScheduleType) scheduleType?: ScheduleType;
  @ApiPropertyOptional({enum:["true","false"]}) @IsOptional() @IsIn(["true","false"]) active?: string;
}
export class ManualReadingDto {
  @ApiProperty() @IsUUID() assetId: string;
  @ApiProperty() @IsDateString({strict:true}) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) measuredAt: string;
  @ApiProperty({enum:["OPERATING_HOURS","TEMPERATURE","VIBRATION"]}) @IsIn(["OPERATING_HOURS","TEMPERATURE","VIBRATION"]) parameter: string;
  @ApiProperty() @IsNumber({maxDecimalPlaces:4}) @Min(-999999.9999) @Max(99999999.99) value: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class CorrectReadingDto {
  @ApiProperty() @IsNumber({maxDecimalPlaces:4}) @Min(-999999.9999) @Max(99999999.99) value: number;
  @ApiProperty() @Transform(({value}) => typeof value === "string" ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}
export class QueryReadingsDto extends PmPageDto {
  @ApiPropertyOptional({enum:["OPERATING_HOURS","TEMPERATURE","VIBRATION"]}) @IsOptional() @IsIn(["OPERATING_HOURS","TEMPERATURE","VIBRATION"]) parameter?: string;
}
