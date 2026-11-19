import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HistoryService } from './history.service';
import { CreateAssetHistoryDto } from './dto/create-history.dto';
import {
  AssetEventBus,
  AssetMaintenanceEvent,
  AssetRepairEvent,
  AssetReplacementEvent,
} from './events';
import {
  EmitMaintenanceEventDto,
  EmitRepairEventDto,
  EmitReplacementEventDto,
} from './dto/record-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Asset History & Audit Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('history')
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly eventBus: AssetEventBus,
  ) {}

  // ================= DOMAIN EVENT DISPATCH ENDPOINTS =================

  @Post('events/maintenance')
  @Roles('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Kích hoạt sự kiện Bảo trì thiết bị (Maintenance Event)',
    description:
      'Phát sự kiện bảo trì vào Event Bus. Listener sẽ tự động ghi log lịch sử chi tiết mà TUYỆT ĐỐI KHÔNG làm thay đổi trạng thái (status) của Asset.',
  })
  @ApiResponse({ status: 202, description: 'Sự kiện bảo trì đã được phát thành công.' })
  emitMaintenanceEvent(@Body() dto: EmitMaintenanceEventDto) {
    const costParts = (dto.partsReplaced || []).reduce(
      (sum, p) => sum + Number(p.totalPrice || p.unitPrice * p.quantity || 0),
      0,
    );
    const event = new AssetMaintenanceEvent({
      ...dto,
      costParts,
      costLabor: dto.costLabor || 0,
      totalCost: costParts + (dto.costLabor || 0),
    });
    this.eventBus.emitMaintenance(event);
    return {
      success: true,
      message: `Đã phát sự kiện BẢO TRÌ cho thiết bị ${dto.assetId}. Lịch sử được tự động ghi nhận không can thiệp trạng thái máy.`,
      eventPayload: event,
    };
  }

  @Post('events/repair')
  @Roles('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Kích hoạt sự kiện Sửa chữa sự cố (Repair Event)',
    description:
      'Phát sự kiện sửa chữa vào Event Bus. Listener ghi nhận nhật ký hỏng hóc & sửa chữa mà TUYỆT ĐỐI KHÔNG làm thay đổi trạng thái (status) của Asset.',
  })
  @ApiResponse({ status: 202, description: 'Sự kiện sửa chữa đã được phát thành công.' })
  emitRepairEvent(@Body() dto: EmitRepairEventDto) {
    const costParts = (dto.partsReplaced || []).reduce(
      (sum, p) => sum + Number(p.totalPrice || p.unitPrice * p.quantity || 0),
      0,
    );
    const event = new AssetRepairEvent({
      ...dto,
      costParts,
      costLabor: dto.costLabor || 0,
      totalCost: costParts + (dto.costLabor || 0),
    });
    this.eventBus.emitRepair(event);
    return {
      success: true,
      message: `Đã phát sự kiện SỬA CHỮA cho thiết bị ${dto.assetId}. Lịch sử được tự động ghi nhận không can thiệp trạng thái máy.`,
      eventPayload: event,
    };
  }

  @Post('events/replacement')
  @Roles('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Kích hoạt sự kiện Thay thế phụ tùng (Replacement Event)',
    description:
      'Phát sự kiện thay thế linh kiện vào Event Bus. Listener ghi nhận snapshot danh sách linh kiện thay thế mà TUYỆT ĐỐI KHÔNG làm thay đổi trạng thái (status) của Asset.',
  })
  @ApiResponse({ status: 202, description: 'Sự kiện thay thế linh kiện đã được phát thành công.' })
  emitReplacementEvent(@Body() dto: EmitReplacementEventDto) {
    const costParts = dto.partsReplaced.reduce(
      (sum, p) => sum + Number(p.totalPrice || p.unitPrice * p.quantity || 0),
      0,
    );
    const event = new AssetReplacementEvent({
      ...dto,
      costParts,
      costLabor: dto.costLabor || 0,
      totalCost: costParts + (dto.costLabor || 0),
    });
    this.eventBus.emitReplacement(event);
    return {
      success: true,
      message: `Đã phát sự kiện THAY THẾ PHỤ TÙNG cho thiết bị ${dto.assetId}. Lịch sử được tự động ghi nhận không can thiệp trạng thái máy.`,
      eventPayload: event,
    };
  }

  // ================= QUERY & METRIC ENDPOINTS =================

  // Lấy báo cáo tổng hợp MTTR, MTBF & Availability toàn bộ thiết bị (hoặc theo xưởng)
  @Get('metrics/overview')
  @ApiOperation({ summary: 'Lấy báo cáo MTTR, MTBF và Availability toàn bộ 300+ thiết bị' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Lọc theo ID phân xưởng' })
  getAllMetrics(@Query('locationId') locationId?: string) {
    return this.historyService.calculateAllAssetsReliability(locationId);
  }

  // Lấy dòng thời gian lịch sử sự kiện bảo trì của máy
  @Get('asset/:assetId')
  @ApiOperation({ summary: 'Lấy dòng thời gian bảo trì của thiết bị' })
  @ApiParam({ name: 'assetId', description: 'UUID của thiết bị' })
  getHistory(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.historyService.getHistoryByAsset(assetId);
  }

  // Lấy báo cáo chi tiết chỉ số MTTR & MTBF của máy
  @Get('asset/:assetId/metrics')
  @ApiOperation({ summary: 'Lấy báo cáo chi tiết chỉ số MTTR và MTBF của thiết bị' })
  @ApiParam({ name: 'assetId', description: 'UUID của thiết bị' })
  getMetrics(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.historyService.calculateMetricsForAsset(assetId);
  }

  // Ghi nhận nhật ký bảo trì / sự cố trực tiếp
  @Post()
  @Roles('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')
  @ApiOperation({ summary: 'Ghi nhật ký sự cố hoặc bảo trì mới cho thiết bị' })
  createHistory(@Body() dto: CreateAssetHistoryDto) {
    return this.historyService.createHistoryLog(dto);
  }
}
