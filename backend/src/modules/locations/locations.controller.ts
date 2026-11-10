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
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('tree')
  @ApiOperation({
    summary: 'Lấy cấu trúc cây thư mục vị trí hoàn chỉnh (Nhà máy -> Phân xưởng -> Dây chuyền)',
    description:
      'Trả về danh sách dạng cây phân cấp (tree structure) kèm theo tổng số thiết bị (assetCount) đang vận hành tại từng vị trí.',
  })
  @ApiResponse({ status: 200, description: 'Lấy cây vị trí thành công.' })
  getTree() {
    return this.locationsService.getTree();
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách vị trí nhà xưởng',
    description: 'Có thể lấy dạng danh sách phẳng hoặc dạng cây thông qua tham số query asTree=true.',
  })
  @ApiQuery({
    name: 'asTree',
    required: false,
    example: 'true',
    description: 'Truyền true để lấy định dạng cây phân cấp',
  })
  @ApiResponse({ status: 200, description: 'Danh sách vị trí.' })
  findAll(@Query('asTree') asTree?: string) {
    return this.locationsService.findAll(asTree === 'true');
  }

  @Get(':id/assets')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả thiết bị thuộc một vị trí / phân xưởng',
  })
  @ApiParam({ name: 'id', description: 'UUID của vị trí' })
  @ApiResponse({ status: 200, description: 'Danh sách thiết bị tại vị trí này.' })
  getAssets(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.getAssetsByLocation(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết thông tin một vị trí kèm các nhánh con và thiết bị' })
  @ApiParam({ name: 'id', description: 'UUID của vị trí' })
  @ApiResponse({ status: 200, description: 'Chi tiết vị trí.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vị trí.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo mới một vị trí (Nhà xưởng / Phân xưởng / Dây chuyền)' })
  @ApiResponse({ status: 201, description: 'Vị trí đã được tạo thành công.' })
  @ApiResponse({ status: 409, description: 'Mã vị trí đã tồn tại.' })
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin vị trí' })
  @ApiParam({ name: 'id', description: 'UUID của vị trí cần cập nhật' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vị trí.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Vô hiệu hóa vị trí (Xóa mềm)',
    description: 'Chỉ xóa được khi không còn vị trí con hoặc máy móc nào trực thuộc vị trí này.',
  })
  @ApiParam({ name: 'id', description: 'UUID của vị trí cần xóa' })
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa vị trí thành công.' })
  @ApiResponse({ status: 409, description: 'Còn vị trí con hoặc máy móc trực thuộc.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.remove(id);
  }
}
