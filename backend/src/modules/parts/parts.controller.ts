import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkOrderActor } from '../work-orders/work-orders.service';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { PartsService } from './parts.service';
import {
  AdjustStockDto,
  CreateAssetPartBomDto,
  CreatePartDto,
  IssuePartToAssetDto,
  QueryPartDto,
  UpdatePartDto,
} from './dto/create-part.dto';

@ApiTags('Parts & Inventory')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'WAREHOUSE_KEEPER', 'MAINTENANCE_MANAGER', 'TECHNICIAN')
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  // 1. ENDPOINT: LẤY DANH SÁCH PHỤ TÙNG (PHÂN TRANG, TÌM KIẾM, LỌC TỒN KHO)
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách phụ tùng trong kho',
    description:
      'Hỗ trợ phân trang, tìm kiếm theo từ khóa (Mã PART-xxx, Tên, Kệ kho, Nhà cung cấp), lọc theo danh mục hoặc lọc các phụ tùng sắp hết hàng (currentStock <= minimumStock).',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công kèm phân trang.' })
  findAll(@Query() query: QueryPartDto) {
    return this.partsService.findAll(query);
  }

  // 2. ENDPOINT: THỐNG KÊ TỔNG QUAN TỒN KHO VÀ GIÁ TRỊ VẬT TƯ
  @Get('overview')
  @ApiOperation({
    summary: 'Lấy thống kê tổng quan kho vật tư',
    description:
      'Tổng số loại phụ tùng, tổng số lượng tồn kho (quantity_on_hand), tổng giá trị kho (VNĐ) và số lượng phụ tùng đang dưới ngưỡng an toàn (minimum_stock).',
  })
  @ApiResponse({ status: 200, description: 'Thống kê tổng quan kho vật tư.' })
  getOverview() {
    return this.partsService.getInventoryOverview();
  }

  // 3. ENDPOINT: DANH SÁCH CẢNH BÁO TỒN KHO DƯỚI NGƯỠNG AN TOÀN
  @Get('alerts/low-stock')
  @ApiOperation({
    summary: 'Lấy danh sách phụ tùng sắp hết hàng hoặc đã hết hàng',
    description:
      'Liệt kê tất cả phụ tùng có currentStock <= minimumStock, phân loại mức độ nghiêm trọng (CRITICAL_OUT_OF_STOCK hoặc WARNING_LOW_STOCK) để lập kế hoạch mua hàng.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách cảnh báo tồn kho tối thiểu.' })
  getLowStockAlerts() {
    return this.partsService.getLowStockAlerts();
  }

  // 4. ENDPOINT: XEM CHI TIẾT 1 PHỤ TÙNG
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phụ tùng kèm định mức gắn trên các máy' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  @ApiResponse({ status: 200, description: 'Chi tiết phụ tùng.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phụ tùng.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.findOne(id);
  }

  // 5. ENDPOINT: TẠO MÃ PHỤ TÙNG MỚI
  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo mã phụ tùng mới trong kho' })
  @ApiResponse({ status: 201, description: 'Tạo mới thành công.' })
  @ApiResponse({ status: 409, description: 'Mã phụ tùng đã tồn tại.' })
  create(@Body() dto: CreatePartDto) {
    return this.partsService.create(dto);
  }

  // 6. ENDPOINT: CẬP NHẬT THÔNG TIN PHỤ TÙNG
  @Patch(':id')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  @ApiOperation({ summary: 'Cập nhật thông tin phụ tùng, đơn giá, vị trí kệ hoặc ngưỡng an toàn' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phụ tùng.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartDto,
  ) {
    return this.partsService.update(id, dto);
  }

  // 7. ENDPOINT: VÔ HIỆU HÓA PHỤ TÙNG (XÓA MỀM)
  @Delete(':id')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  @ApiOperation({ summary: 'Vô hiệu hóa phụ tùng (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phụ tùng.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.remove(id);
  }

  // 8. ENDPOINT CỐT LÕI: XUẤT PHỤ TÙNG SỬA CHỮA CHO THIẾT BỊ (GIAO DỊCH ACID)
  @Post('issue-to-asset')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
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
  issuePartToAsset(@Body() dto: IssuePartToAssetDto, @CurrentUser() actor: WorkOrderActor) {
    return this.partsService.issuePartToAsset({ ...dto, performedById: actor.id });
  }

  // 9. ENDPOINT: ĐIỀU CHỈNH TỒN KHO (NHẬP / XUẤT / KIỂM KÊ)
  @Post(':id/adjust')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  @ApiOperation({ summary: 'Điều chỉnh số lượng tồn kho (Nhập/Xuất/Kiểm kê)' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() actor: WorkOrderActor,
  ) {
    return this.partsService.adjustStock(id, { ...dto, performedById: actor.id });
  }

  // 10. ENDPOINT: XEM LỊCH SỬ XUẤT NHẬP CỦA PHỤ TÙNG
  @Get(':id/transactions')
  @ApiOperation({ summary: 'Xem lịch sử xuất/nhập của một phụ tùng' })
  @ApiParam({ name: 'id', description: 'UUID của phụ tùng' })
  getTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.getTransactions(id);
  }

  // 11. ENDPOINT: THIẾT LẬP ĐỊNH MỨC PHỤ TÙNG (BOM) CHO MÁY
  @Post('bom')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  @ApiOperation({ summary: 'Thiết lập định mức phụ tùng (BOM) cho thiết bị' })
  createBom(@Body() dto: CreateAssetPartBomDto) {
    return this.partsService.createBom(dto);
  }

  // 12. ENDPOINT: XEM DANH SÁCH ĐỊNH MỨC BOM THEO MÁY
  @Get('bom/asset/:assetId')
  @ApiOperation({ summary: 'Xem danh sách định mức phụ tùng của một thiết bị' })
  @ApiParam({ name: 'assetId', description: 'UUID của thiết bị' })
  getBomByAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.partsService.getBomByAsset(assetId);
  }
}
