import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PartsService } from './parts.service';
import {
  AdjustStockDto,
  CreateAssetPartBomDto,
  CreatePartDto,
} from './dto/create-part.dto';

@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get()
  findAll(@Query('lowStockOnly') lowStockOnly?: string) {
    return this.partsService.findAll(lowStockOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartDto) {
    return this.partsService.create(dto);
  }

  // Điều chỉnh tồn kho / xuất kho sửa chữa (với transaction & lock)
  @Post(':id/adjust')
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.partsService.adjustStock(id, dto);
  }

  @Get(':id/transactions')
  getTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.partsService.getTransactions(id);
  }

  // Quản lý định mức phụ tùng (BOM) theo thiết bị
  @Post('bom')
  createBom(@Body() dto: CreateAssetPartBomDto) {
    return this.partsService.createBom(dto);
  }

  @Get('bom/asset/:assetId')
  getBomByAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.partsService.getBomByAsset(assetId);
  }
}
