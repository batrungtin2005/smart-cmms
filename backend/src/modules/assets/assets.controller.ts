import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import {
  CreateAssetDto,
  QueryAssetDto,
  UpdateAssetDto,
} from './dto/create-asset.dto';

@Controller('api/v1/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Query() query: QueryAssetDto) {
    return this.assetsService.findAll(query);
  }

  // Tra cứu nhanh theo mã thiết bị (phục vụ quét QR code trên Mobile Flutter)
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, dto);
  }

  @Patch(':id/operating-hours')
  updateOperatingHours(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('additionalHours') additionalHours: number,
  ) {
    return this.assetsService.incrementOperatingHours(id, additionalHours);
  }
}
