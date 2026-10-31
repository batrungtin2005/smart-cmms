import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { CreateAssetHistoryDto } from './dto/create-history.dto';

@Controller('api/v1/assets/:assetId')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  // Lấy dòng thời gian lịch sử sự kiện bảo trì của máy
  @Get('history')
  getHistory(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.historyService.getHistoryByAsset(assetId);
  }

  // Lấy báo cáo chi tiết chỉ số MTTR & MTBF của máy
  @Get('metrics')
  getMetrics(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.historyService.calculateMetricsForAsset(assetId);
  }

  // Ghi nhận nhật ký bảo trì / sự cố thủ công hoặc từ hệ thống
  @Post('history')
  createHistory(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: CreateAssetHistoryDto,
  ) {
    dto.assetId = assetId;
    return this.historyService.createHistoryLog(dto);
  }
}
