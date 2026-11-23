import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PmActor } from "./pm.types";
import { ReadingsService } from "./readings.service";
import { MAX_UPLOAD_BYTES, readingTemplate } from "./excel-readings";
import { CorrectReadingDto, ManualReadingDto, PmPageDto, QueryReadingsDto } from "./dto/schedule.dto";

@ApiTags("Readings and Excel imports") @ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard) @Roles("ADMIN", "MAINTENANCE_MANAGER")
@Controller()
export class ReadingsController {
  constructor(private readonly service: ReadingsService) {}
  @Get("reading-imports/template")
  async template(@Res() response: Response) {
    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", 'attachment; filename="cmms-readings-v1.xlsx"');
    response.send(await readingTemplate());
  }
  @Post("reading-imports/preview") @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } })
  @ApiOperation({ summary: "Xem trước Excel: tối đa 5 MiB, 500 dòng, chưa lưu số đo" })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0 } }))
  preview(@UploadedFile() file: { buffer: Buffer; originalname: string }, @CurrentUser() actor: PmActor) {
    if (!file) throw new BadRequestException("file is required");
    return this.service.preview(file.buffer, file.originalname, actor);
  }
  @Post("reading-imports/:id/confirm") confirm(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: PmActor) { return this.service.confirm(id, actor); }
  @Get("reading-imports") list(@Query() query: PmPageDto, @CurrentUser() actor: PmActor) { return this.service.list(query, actor); }
  @Get("reading-imports/:id") detail(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: PmActor) { return this.service.detail(id, actor); }
  @Get("assets/:id/readings") @Roles("ADMIN", "MAINTENANCE_MANAGER", "TECHNICIAN")
  readings(@Param("id", ParseUUIDPipe) id: string, @Query() query: QueryReadingsDto, @CurrentUser() actor: PmActor) { return this.service.readings(id, query, actor); }
  @Post("readings") @Roles("ADMIN", "MAINTENANCE_MANAGER", "TECHNICIAN")
  @ApiOperation({ summary: "Nhập một số đo; KTV chỉ nhập cho thiết bị có phiếu đang được giao" })
  manual(@Body() dto: ManualReadingDto, @CurrentUser() actor: PmActor) { return this.service.manual(dto, actor); }
  @Post("readings/:id/corrections")
  correct(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CorrectReadingDto, @CurrentUser() actor: PmActor) { return this.service.correct(id, dto, actor); }
}
