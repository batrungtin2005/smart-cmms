import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorkOrdersModule } from "../work-orders/work-orders.module";
import { MaintenanceSchedule } from "./entities/maintenance-schedule.entity";
import { AssetReading, AssetReadingSubmission } from "./entities/asset-reading.entity";
import { ReadingImport } from "./entities/reading-import.entity";
import { ScheduleTrigger } from "./entities/schedule-trigger.entity";
import { SchedulesController } from "./schedules.controller";
import { ReadingsController } from "./readings.controller";
import { SchedulesService } from "./schedules.service";
import { ReadingsService } from "./readings.service";
import { ScheduleEngine } from "./schedule-engine.service";
import { SchedulesScheduler } from "./schedules.scheduler";

@Module({
  imports: [WorkOrdersModule, TypeOrmModule.forFeature([MaintenanceSchedule, AssetReading, AssetReadingSubmission, ReadingImport, ScheduleTrigger])],
  controllers: [SchedulesController, ReadingsController],
  providers: [SchedulesService, ReadingsService, ScheduleEngine, SchedulesScheduler],
  exports: [SchedulesService, ReadingsService, ScheduleEngine],
})
export class SchedulesModule {}
