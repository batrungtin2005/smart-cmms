import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { HistoryService } from './history.service';
import { CreateAssetHistoryDto } from './dto/create-history.dto';

@ApiTags('Asset History')
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

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
