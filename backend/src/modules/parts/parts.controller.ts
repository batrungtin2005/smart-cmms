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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PartsService } from './parts.service';
import {
  AdjustStockDto,
  CreateAssetPartBomDto,
  CreatePartDto,
  IssuePartToAssetDto,
} from './dto/create-part.dto';

@ApiTags('Parts & Inventory')
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách phụ tùng trong kho',
    description: 'Có thể lọc các phụ tùng sắp hết hàng (currentStock <= minimumStock).',
  })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  findAll(@Query('lowStockOnly') lowStockOnly?: string) {
    return this.partsService.findAll(lowStockOnly === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phụ tùng kèm định mức gắn trên các máy' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo mã phụ tùng mới trong kho' })
  create(@Body() dto: CreatePartDto) {
    return this.partsService.create(dto);
  }

  // =====================================================================================
  // API CỐT LÕI: XUẤT PHỤ TÙNG SỬA CHỮA CHO THIẾT BỊ
  // Tự động trừ tồn kho (Pessimistic Lock) & tự động tạo 1 bản ghi trong AssetHistory
  // =====================================================================================
  @Post('issue-to-asset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xuất phụ tùng ra sửa chữa cho một tài sản',
    description:
      'Thực hiện giao dịch nguyên tử (Atomic Database Transaction): Tự động trừ tồn kho phụ tùng với khóa chống âm kho, ghi log biến động kho, đồng thời tự động ghi nhận một dòng mới vào bảng lịch sử sửa chữa của thiết bị (AssetHistory).',
  })
  @ApiResponse({
    status: 200,
    description: 'Xuất phụ tùng thành công và đã ghi nhận vào lịch sử thiết bị.',
  })
  @ApiResponse({
    status: 400,
    description: 'Số lượng tồn kho không đủ để xuất.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phụ tùng hoặc tài sản tương ứng.',
  })
  issuePartToAsset(@Body() dto: IssuePartToAssetDto) {
    return this.partsService.issuePartToAsset(dto);
  }

  // Điều chỉnh tồn kho / xuất nhập kho thông thường
  @Post(':id/adjust')
  @ApiOperation({ summary: 'Điều chỉnh số lượng tồn kho (Nhập/Xuất/Kiểm kê)' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.partsService.adjustStock(id, dto);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Xem lịch sử xuất/nhập của một phụ tùng' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  getTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.getTransactions(id);
  }

  // Quản lý định mức phụ tùng (BOM) theo thiết bị
  @Post('bom')
  @ApiOperation({ summary: 'Thiết lập định mức phụ tùng (BOM) cho thiết bị' })
  createBom(@Body() dto: CreateAssetPartBomDto) {
    return this.partsService.createBom(dto);
  }

  @Get('bom/asset/:assetId')
  @ApiOperation({ summary: 'Xem danh sách định mức phụ tùng của một thiết bị' })
  @ApiParam({ name: 'assetId', description: 'UUID của thiết bị' })
  getBomByAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.partsService.getBomByAsset(assetId);
  }
}
