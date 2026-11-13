import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsString, IsNotEmpty, MaxLength } from "class-validator";

export class VerifyWorkOrderDto {
  @ApiProperty({ enum: ["ACCEPT", "REJECT"] })
  @IsIn(["ACCEPT", "REJECT"])
  decision: "ACCEPT" | "REJECT";

  @ApiProperty({
    maxLength: 1000,
    description: "Kết quả nghiệm thu hoặc lý do yêu cầu sửa lại",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  verificationNotes: string;
}
