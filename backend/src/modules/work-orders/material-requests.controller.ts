import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  CreateMaterialRequestDto,
  MaterialRequestReasonDto,
  QueryMaterialRequestsDto,
} from "./dto/material-request.dto";
import { MaterialRequestsService } from "./material-requests.service";
import { WorkOrderActor } from "./work-orders.service";

@ApiTags("Material Requests")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MaterialRequestsController {
  constructor(private readonly service: MaterialRequestsService) {}

  @Post("work-orders/:id/material-requests")
  @Roles("TECHNICIAN")
  @ApiOperation({ summary: "KTV gửi yêu cầu vật tư; chưa trừ kho" })
  create(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMaterialRequestDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.service.create(id, dto, actor);
  }
  @Get("material-requests")
  @Roles("TECHNICIAN", "WAREHOUSE_KEEPER", "ADMIN", "MAINTENANCE_MANAGER")
  @ApiOperation({ summary: "Danh sách yêu cầu; KTV chỉ xem yêu cầu của mình" })
  list(
    @Query() query: QueryMaterialRequestsDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.service.list(query, actor);
  }

  @Get("material-requests/:id")
  @Roles("TECHNICIAN", "WAREHOUSE_KEEPER", "ADMIN", "MAINTENANCE_MANAGER")
  detail(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.service.detail(id, actor);
  }

  @Patch("material-requests/:id/approve")
  @Roles("WAREHOUSE_KEEPER", "ADMIN")
  @ApiOperation({ summary: "Duyệt và xuất toàn bộ vật tư trong một giao dịch" })
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.service.resolve(id, "approve", actor);
  }

  @Patch("material-requests/:id/reject")
  @Roles("WAREHOUSE_KEEPER", "ADMIN")
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MaterialRequestReasonDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.service.resolve(id, "reject", actor, dto.reason);
  }

  @Patch("material-requests/:id/cancel")
  @Roles("TECHNICIAN")
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MaterialRequestReasonDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.service.resolve(id, "cancel", actor, dto.reason);
  }
}
