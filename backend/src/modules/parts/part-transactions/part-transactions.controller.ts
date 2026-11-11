import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PartTransactionsService } from './part-transactions.service';
import {
  ImportPartStockDto,
  ExportPartStockDto,
  QueryPartTransactionDto,
} from './dto';

@ApiTags('Part Transactions & Stock Movements')
@Controller('part-transactions')
export class PartTransactionsController {
  constructor(
    private readonly transactionsService: PartTransactionsService,
  ) {}

  // 1. ENDPOINT: GHI KHO ĐẦU VÀO (NHẬP KHO VẬT TƯ)
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ghi kho đầu vào (Nhập kho vật tư / phụ tùng)',
    description:
      'Thực hiện giao dịch ACID với Khóa bi quan (Pessimistic Lock) để cập nhật tăng số lượng tồn kho (current_stock / quantity_on_hand), cập nhật giá vốn nhập mới nhất và ghi log giao dịch IMPORT.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ghi nhận nhập kho thành công.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mã phụ tùng cần nhập.',
  })
  importStock(@Body() dto: ImportPartStockDto) {
    return this.transactionsService.importStock(dto);
  }

  // 2. ENDPOINT: XUẤT KHO CHO LỆNH SẢN XUẤT / LỆNH BẢO TRÌ (KIỂM SOÁT TỒN KHO KHÔNG ÂM)
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xuất kho phụ tùng cho Lệnh sản xuất / Work Order (Khóa chống tồn âm)',
    description:
      'Thực hiện giao dịch nguyên tử (ACID) với Khóa bi quan (Pessimistic Write Lock). Kiểm soát nghiêm ngặt: nếu số lượng yêu cầu xuất vượt quá tồn kho thực tế thì lập tức hủy bỏ giao dịch (rollback) và ném lỗi 400 Bad Request, không cho phép tồn kho âm.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xuất kho thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Số lượng tồn kho không đủ để xuất (chống tồn kho âm).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phụ tùng tương ứng.',
  })
  exportStock(@Body() dto: ExportPartStockDto) {
    return this.transactionsService.exportStockForProduction(dto);
  }

  // 3. ENDPOINT ALIAS: XUẤT KHO CHO LỆNH SẢN XUẤT / LỆNH BẢO TRÌ
  @Post('export-work-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xuất kho cho Lệnh sản xuất / Lệnh bảo trì (Alias)',
    description:
      'Tương tự như /export, hỗ trợ gắn trực tiếp mã Lệnh sản xuất (productionOrderCode) hoặc workOrderId.',
  })
  exportStockForWorkOrder(@Body() dto: ExportPartStockDto) {
    return this.transactionsService.exportStockForProduction(dto);
  }

  // 4. ENDPOINT: TRUY VẤN LỊCH SỬ GIAO DỊCH KHO
  @Get()
  @ApiOperation({
    summary: 'Lấy lịch sử giao dịch xuất / nhập kho',
    description:
      'Hỗ trợ phân trang, lọc theo mã phụ tùng, lọc theo Lệnh sản xuất / Work Order, loại giao dịch (IMPORT / EXPORT / ADJUSTMENT) và khoảng thời gian.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử giao dịch thành công kèm metadata phân trang.',
  })
  findAll(@Query() query: QueryPartTransactionDto) {
    return this.transactionsService.findAll(query);
  }

  // 5. ENDPOINT: LẤY DANH SÁCH PHỤ TÙNG ĐÃ XUẤT CHO 1 LỆNH SẢN XUẤT / WORK ORDER
  @Get('work-order/:workOrderId')
  @ApiOperation({
    summary: 'Lấy danh sách phụ tùng đã xuất cho một Lệnh sản xuất / Work Order',
    description:
      'Thống kê toàn bộ phụ tùng đã xuất kho phục vụ cho lệnh làm việc cụ thể và tổng chi phí vật tư đã sử dụng.',
  })
  @ApiParam({
    name: 'workOrderId',
    description: 'UUID của Lệnh sản xuất / Work Order',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê danh sách phụ tùng đã xuất cho Work Order.',
  })
  findByWorkOrder(@Param('workOrderId', ParseUUIDPipe) workOrderId: string) {
    return this.transactionsService.findByWorkOrder(workOrderId);
  }

  // 6. ENDPOINT: XEM CHI TIẾT 1 BẢN GHI GIAO DỊCH
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một giao dịch kho' })
  @ApiParam({ name: 'id', description: 'UUID của bản ghi giao dịch' })
  @ApiResponse({ status: 200, description: 'Chi tiết giao dịch kho.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }
}

