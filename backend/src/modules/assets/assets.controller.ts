import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProduces,
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

  // 1. ENDPOINT: LẤY DANH SÁCH TÀI SẢN (PHÂN TRANG, TÌM KIẾM, LỌC TRẠNG THÁI)
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tài sản / thiết bị',
    description:
      'Hỗ trợ phân trang, tìm kiếm theo từ khóa (Mã AST-xxx, Tên máy, Model, Hãng SX, Seri), lọc theo trạng thái (OPERATIONAL, DOWN, MAINTENANCE, DECOMMISSIONED), độ quan trọng, nhóm thiết bị hoặc vị trí nhà xưởng.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công kèm dữ liệu phân trang.' })
  findAll(@Query() query: QueryAssetDto) {
    return this.assetsService.findAll(query);
  }

  // 2. ENDPOINT: THỐNG KÊ TỔNG QUAN TÀI SẢN CHO DASHBOARD
  @Get('overview')
  @ApiOperation({
    summary: 'Lấy số liệu thống kê tổng quan thiết bị cho Dashboard',
    description:
      'Tổng số máy, cơ cấu trạng thái (đang chạy, hỏng dừng máy, bảo trì), cơ cấu độ quan trọng và chỉ số MTTR/MTBF trung bình toàn hệ thống.',
  })
  @ApiResponse({ status: 200, description: 'Thống kê tổng quan thành công.' })
  getOverview() {
    return this.assetsService.getOverview();
  }

  // 3. ENDPOINT: TRA CỨU THEO MÃ QR CODE / MÃ ASSET CODE
  @Get('code/:code')
  @ApiOperation({
    summary: 'Tra cứu nhanh thiết bị theo mã định danh (AST-xxx)',
    description: 'Endpoint chuyên dụng cho kỹ thuật viên quét mã QR trên ứng dụng di động Flutter.',
  })
  @ApiParam({ name: 'code', example: 'AST-001', description: 'Mã tài sản định danh' })
  @ApiResponse({ status: 200, description: 'Tìm thấy thiết bị.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị có mã tương ứng.' })
  findByCode(@Param('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  // 4. ENDPOINT: LẤY DỮ LIỆU MÃ QR VÀ TEM NHÃN IN THEO MÃ CODE
  @Get('code/:code/qr-code')
  @ApiOperation({
    summary: 'Lấy dữ liệu mã QR (Base64) và thông tin tem in theo mã tài sản',
    description: 'Trả về chuỗi Data URL Base64 PNG để hiển thị trực tiếp và thông tin in ấn nhãn nhận diện.',
  })
  @ApiParam({ name: 'code', example: 'AST-001', description: 'Mã tài sản định danh' })
  @ApiResponse({ status: 200, description: 'Sinh mã QR thành công.' })
  getQrByCode(@Param('code') code: string) {
    return this.assetsService.getQrCodeData(code);
  }

  // 5. ENDPOINT: TẢI TRỰC TIẾP FILE ẢNH PNG MÃ QR THEO MÃ CODE
  @Get('code/:code/qr-image')
  @ApiOperation({
    summary: 'Tải file ảnh PNG mã QR của thiết bị theo mã tài sản',
    description: 'Trả về file ảnh image/png độ phân giải cao phục vụ tải về hoặc in tem.',
  })
  @ApiProduces('image/png')
  @ApiParam({ name: 'code', example: 'AST-001', description: 'Mã tài sản' })
  async downloadQrImageByCode(@Param('code') code: string, @Res() res: Response) {
    const { buffer, assetCode } = await this.assetsService.getQrBuffer(code);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="QR-${assetCode}.png"`);
    res.send(buffer);
  }

  // 6. ENDPOINT: QUÉT MÃ QR KIỂM TRA LỊCH SỬ & PHỤ TÙNG CẦN THAY ĐỊNH KỲ
  @Get('scan-qr')
  @ApiOperation({
    summary: 'Quét mã QR kiểm tra lịch sử thiết bị & phụ tùng thay thế định kỳ',
    description:
      'Nhận vào chuỗi quét mã QR, mã tài sản (AST-001) hoặc UUID. Trả về thông số kỹ thuật, lịch sử bảo trì và bảng đánh giá các phụ tùng cần thay thế định kỳ (tính toán số giờ còn lại, cảnh báo quá hạn OVERDUE / DUE_SOON và tình trạng tồn kho).',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    example: 'AST-001',
    description: 'Nội dung chuỗi quét QR Code, mã tài sản (AST-001) hoặc UUID',
  })
  @ApiResponse({ status: 200, description: 'Thông tin thiết bị và danh mục phụ tùng thay thế định kỳ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị.' })
  scanQr(@Query('code') code: string) {
    return this.assetsService.scanQrAndGetInspectionDetails(code);
  }

  @Get('inspect/:identifier')
  @ApiOperation({
    summary: 'Tra cứu kiểm tra thiết bị qua mã định danh / QR param',
    description: 'Truyền trực tiếp mã QR, mã code hoặc Asset ID vào URL path.',
  })
  @ApiParam({
    name: 'identifier',
    example: 'AST-001',
    description: 'Mã QR hoặc Asset ID hoặc Asset Code (VD: AST-001 hoặc UUID)',
  })
  inspectByIdentifier(@Param('identifier') identifier: string) {
    return this.assetsService.scanQrAndGetInspectionDetails(identifier);
  }

  // 7. ENDPOINT: LẤY DỮ LIỆU MÃ QR THEO UUID TÀI SẢN
  @Get(':id/qr-code')
  @ApiOperation({
    summary: 'Lấy dữ liệu mã QR (Base64) và tem nhãn in ấn theo UUID tài sản',
    description: 'Tích hợp thư viện qrcode sinh mã QR duy nhất kèm mẫu tem nhãn kỹ thuật chuẩn xưởng.',
  })
  @ApiParam({ name: 'id', description: 'UUID của tài sản' })
  @ApiResponse({ status: 200, description: 'Sinh mã QR thành công.' })
  getQrById(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getQrCodeData(id);
  }

  // 8. ENDPOINT: TẢI TRỰC TIẾP FILE ẢNH PNG MÃ QR THEO UUID
  @Get(':id/qr-image')
  @ApiOperation({
    summary: 'Tải trực tiếp ảnh PNG mã QR của tài sản theo UUID',
    description: 'Stream trực tiếp binary image/png độ phân giải 400x400 để máy in nhãn công nghiệp in ra tem.',
  })
  @ApiProduces('image/png')
  @ApiParam({ name: 'id', description: 'UUID của tài sản' })
  async downloadQrImageById(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, assetCode } = await this.assetsService.getQrBuffer(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="QR-${assetCode}.png"`);
    res.send(buffer);
  }

  // 9. ENDPOINT: XEM CHI TIẾT 1 TÀI SẢN
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

  // 10. ENDPOINT: THÊM TÀI SẢN MỚI
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

  // 11. ENDPOINT: CẬP NHẬT TRẠNG THÁI TÀI SẢN
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

  // 12. ENDPOINT: CẬP NHẬT THÔNG TIN TÀI SẢN
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

  // 13. ENDPOINT: XÓA TÀI SẢN (SOFT DELETE)
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

  // 14. ENDPOINT: XEM LỊCH SỬ BẢO TRÌ CỦA MỘT TÀI SẢN CỤ THỂ
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
