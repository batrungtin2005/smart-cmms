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
import { AssignWorkOrderDto } from "./dto/assign-work-order.dto";
import { ChangeWorkOrderStatusDto } from "./dto/change-work-order-status.dto";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto";
import {
  MyWorkOrdersQueryDto,
  QueryWorkOrdersDto,
} from "./dto/query-work-orders.dto";
import { WorkOrderActor, WorkOrdersService } from "./work-orders.service";

@ApiTags("Work Orders")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("work-orders")
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Patch(":id/status")
  @Roles("ADMIN", "MAINTENANCE_MANAGER", "TECHNICIAN")
  @ApiOperation({ summary: "Bắt đầu, tạm dừng, tiếp tục hoặc hủy phiếu" })
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeWorkOrderStatusDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.workOrdersService.changeStatus(id, dto, actor);
  }

  @Post()
  @Roles("ADMIN", "MAINTENANCE_MANAGER")
  @ApiOperation({ summary: "Tạo phiếu OPEN; người tạo lấy từ JWT" })
  create(
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.workOrdersService.create(dto, actor);
  }

  @Get()
  @Roles("ADMIN", "MAINTENANCE_MANAGER")
  @ApiOperation({
    summary: "Danh sách phiếu có phân trang, tìm kiếm và bộ lọc",
  })
  findAll(
    @Query() query: QueryWorkOrdersDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.workOrdersService.findAll(query, actor);
  }

  // Static route must precede :id so "my-tasks" is not parsed as a UUID.
  @Get("my-tasks")
  @Roles("TECHNICIAN")
  @ApiOperation({ summary: "Danh sách phiếu của KTV đang đăng nhập" })
  myTasks(
    @Query() query: MyWorkOrdersQueryDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.workOrdersService.myTasks(query, actor);
  }

  @Get(":id")
  @Roles("ADMIN", "MAINTENANCE_MANAGER", "TECHNICIAN")
  @ApiOperation({ summary: "Chi tiết phiếu; KTV chỉ xem phiếu được giao" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.workOrdersService.findOne(id, actor);
  }

  @Patch(":id/assign")
  @Roles("ADMIN", "MAINTENANCE_MANAGER")
  @ApiOperation({
    summary: "Phân công hoặc giao lại phiếu OPEN/ASSIGNED cho KTV hoạt động",
  })
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignWorkOrderDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.workOrdersService.assign(id, dto, actor);
  }
}
