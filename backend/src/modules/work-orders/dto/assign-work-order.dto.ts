import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignWorkOrderDto {
  @ApiProperty({
    format: "uuid",
    description: "UUID tài khoản TECHNICIAN đang hoạt động",
  })
  @IsUUID()
  assignedTechnicianId: string;
}
