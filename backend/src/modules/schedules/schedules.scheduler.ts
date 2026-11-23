import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ScheduleEngine } from "./schedule-engine.service";
import { ReadingsService } from "./readings.service";

@Injectable()
export class SchedulesScheduler {
  private running = false;
  private readonly logger = new Logger(SchedulesScheduler.name);
  constructor(private readonly engine: ScheduleEngine, private readonly readings: ReadingsService) {}
  @Cron("0 * * * * *", { timeZone: "Asia/Ho_Chi_Minh" })
  async tick() {
    if (process.env.PM_CRON_ENABLED === "false" || this.running) return;
    this.running = true;
    try { await this.readings.retryEvaluations(); await this.engine.sweep(); }
    catch { this.logger.error("PM sweep failed; the next tick will retry"); }
    finally { this.running = false; }
  }
}
