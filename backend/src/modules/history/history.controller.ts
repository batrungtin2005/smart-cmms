import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { HistoryService } from './history.service';
import { CreateAssetHistoryDto } from './dto/create-history.dto';

@ApiTags('Asset History')
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) { }

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

  // Ghi nhận nhật ký bảo trì / sự cố thủ công hoặc từ hệ thống
  @Post()
  @ApiOperation({ summary: 'Ghi nhật ký sự cố hoặc bảo trì mới cho thiết bị' })
  createHistory(@Body() dto: CreateAssetHistoryDto) {
    return this.historyService.createHistoryLog(dto);
  }
}
