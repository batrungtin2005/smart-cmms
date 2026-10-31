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
import { AssetsService } from './assets.service';
import {
  CreateAssetDto,
  QueryAssetDto,
  UpdateAssetDto,
  UpdateAssetStatusDto,
} from './dto/create-asset.dto';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // 1. ENDPOINT: LẤY DANH SÁCH TÀI SẢN
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tài sản / thiết bị',
    description:
      'Hỗ trợ phân trang, tìm kiếm theo từ khóa (mã/tên/seri), lọc theo trạng thái vận hành, nhóm thiết bị hoặc vị trí nhà xưởng.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công kèm dữ liệu phân trang.' })
  findAll(@Query() query: QueryAssetDto) {
    return this.assetsService.findAll(query);
  }

  // 2. ENDPOINT: TRA CỨU THEO MÃ QR CODE (PHỤC VỤ MOBILE APP)
  @Get('code/:code')
  @ApiOperation({
    summary: 'Tra cứu nhanh thiết bị theo mã QR Code',
    description: 'Endpoint chuyên dụng cho kỹ thuật viên quét mã QR trên ứng dụng di động Flutter.',
  })
  @ApiParam({ name: 'code', example: 'AST-001', description: 'Mã tài sản định danh' })
  @ApiResponse({ status: 200, description: 'Tìm thấy thiết bị.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị có mã tương ứng.' })
  findByCode(@Param('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  // 3. ENDPOINT: XEM CHI TIẾT 1 TÀI SẢN
  @Get(':id')
  @ApiOperation({
    summary: 'Xem thông tin chi tiết của 1 tài sản',
    description: 'Trả về đầy đủ thông tin máy móc, vị trí xưởng và danh sách phụ tùng định mức (BOM).',
  })
  @ApiParam({ name: 'id', description: 'UUID của tài sản' })
  @ApiResponse({ status: 200, description: 'Chi tiết tài sản.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài sản.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  // 4. ENDPOINT: THÊM TÀI SẢN MỚI
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Thêm mới tài sản',
    description: 'Tạo thiết bị mới, tự động sinh mã QR Code và kiểm tra tính duy nhất của mã asset_code.',
  })
  @ApiResponse({ status: 201, description: 'Tài sản đã được tạo thành công.' })
  @ApiResponse({ status: 409, description: 'Mã tài sản đã tồn tại.' })
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  // 5. ENDPOINT: CẬP NHẬT TRẠNG THÁI TÀI SẢN
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái vận hành của tài sản',
    description: 'Chuyển đổi trạng thái máy giữa OPERATIONAL, DOWN, MAINTENANCE, DECOMMISSIONED.',
  })
  @ApiParam({ name: 'id', description: 'UUID của tài sản' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài sản.' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetStatusDto,
  ) {
    return this.assetsService.updateStatus(id, dto);
  }

  // 6. ENDPOINT: CẬP NHẬT THÔNG TIN TÀI SẢN
  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật thông tin thông số kỹ thuật của tài sản',
    description: 'Cập nhật tên, hãng sản xuất, model, giờ chạy máy hoặc thông số JSON.',
  })
  @ApiParam({ name: 'id', description: 'UUID của tài sản' })
  @ApiResponse({ status: 200, description: 'Cập nhật tài sản thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài sản.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, dto);
  }

  // 7. ENDPOINT: XÓA TÀI SẢN (SOFT DELETE)
  @Delete(':id')
  @ApiOperation({
    summary: 'Vô hiệu hóa tài sản (Xóa mềm)',
    description: 'Chuyển isActive = false để lưu trữ lịch sử, không xóa cứng mất dữ liệu.',
  })
  @ApiParam({ name: 'id', description: 'UUID của tài sản' })
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa tài sản thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài sản.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.remove(id);
  }

  // 8. ENDPOINT: XEM LỊCH SỬ BẢO TRÌ CỦA MỘT TÀI SẢN CỤ THỂ
  @Get(':id/history')
  @ApiOperation({
    summary: 'Xem lịch sử bảo trì / sửa chữa của một tài sản cụ thể',
    description:
      'Lấy toàn bộ dòng thời gian (timeline) sự cố hỏng hóc, sửa chữa, phụ tùng đã thay và tổng hợp các chỉ số Downtime, MTTR của máy.',
  })
  @ApiParam({ name: 'id', description: 'UUID của tài sản cần tra cứu lịch sử' })
  @ApiResponse({ status: 200, description: 'Lấy lịch sử bảo trì thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài sản.' })
  getMaintenanceHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getMaintenanceHistory(id);
  }
}
