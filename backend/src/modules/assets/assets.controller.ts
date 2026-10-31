import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';

@ApiTags('Assets - Quản lý thiết bị / tài sản')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ⚠️ QUAN TRỌNG: Route /code/:code phải đặt TRƯỚC /:id
  // để NestJS không nhầm "code" với UUID id.

  @Get('code/:code')
  @ApiOperation({ summary: 'Tra cứu nhanh thiết bị theo mã QR (Mobile Flutter)' })
  @ApiParam({ name: 'code', example: 'AST-001' })
  @ApiOkResponse({ description: 'Chi tiết thiết bị theo asset_code' })
  findByCode(@Param('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  @Get()
  @ApiOperation({
    summary: 'Danh sách thiết bị (phân trang, tìm kiếm, lọc)',
  })
  @ApiOkResponse({ description: 'Danh sách thiết bị kèm metadata phân trang' })
  findAll(@Query() query: QueryAssetDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 thiết bị theo UUID' })
  @ApiParam({ name: 'id', description: 'UUID của thiết bị' })
  @ApiOkResponse({ description: 'Chi tiết thiết bị' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm mới tài sản & tự động sinh QR code URL' })
  @ApiCreatedResponse({ description: 'Tài sản được tạo thành công' })
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin hoặc trạng thái tài sản' })
  @ApiParam({ name: 'id', description: 'UUID của thiết bị' })
  @ApiOkResponse({ description: 'Tài sản sau khi cập nhật' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, dto);
  }
}
