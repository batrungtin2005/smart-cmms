import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, IsOptional } from "class-validator";

export class CompleteWorkOrderDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  rootCause: string;

  @ApiProperty({ maxLength: 10000 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  solution: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  completionNotes?: string;
}
