import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PmActor } from "./pm.types";
import { SchedulesService } from "./schedules.service";
import { PmPageDto, QuerySchedulesDto, ScheduleActivationDto, ScheduleDto, UpdateScheduleDto } from "./dto/schedule.dto";

@ApiTags("Maintenance schedules") @ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard) @Roles("ADMIN", "MAINTENANCE_MANAGER")
@Controller("schedules")
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}
  @Post() @ApiOperation({ summary: "Tạo lịch theo ngày, giờ vận hành hoặc nhiệt độ/độ rung" })
  create(@Body() dto: ScheduleDto, @CurrentUser() actor: PmActor) { return this.service.create(dto, actor); }
  @Get() list(@Query() dto: QuerySchedulesDto, @CurrentUser() actor: PmActor) { return this.service.list(dto, actor); }
  @Get("due") due(@Query() dto: QuerySchedulesDto, @CurrentUser() actor: PmActor) { return this.service.list(dto, actor, true); }
  @Get(":id") detail(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: PmActor) { return this.service.detail(id, actor); }
  @Patch(":id") @ApiOperation({ summary: "Thay cấu hình đầy đủ; giữ asset/type, kèm expectedRevision" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateScheduleDto, @CurrentUser() actor: PmActor) { return this.service.update(id, dto, actor); }
  @Patch(":id/activation") activation(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ScheduleActivationDto, @CurrentUser() actor: PmActor) { return this.service.activation(id, dto, actor); }
  @Get(":id/work-orders") orders(@Param("id", ParseUUIDPipe) id: string, @Query() dto: PmPageDto, @CurrentUser() actor: PmActor) { return this.service.workOrders(id, dto, actor); }
}
