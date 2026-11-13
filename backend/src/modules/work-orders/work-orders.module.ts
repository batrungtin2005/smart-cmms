import { WorkOrderStatusHistory } from "./entities/work-order-status-history.entity";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Asset } from "../assets/entities/asset.entity";
import { User } from "../auth/entities/user.entity";
import { MaintenanceSchedule } from "../schedules/entities/maintenance-schedule.entity";
import { WorkOrder } from "./entities/work-order.entity";
import { WorkOrderPart } from "./entities/work-order-part.entity";
import { WorkOrdersController } from "./work-orders.controller";
import { WorkOrdersService } from "./work-orders.service";

@Module({
  // MaintenanceSchedule must remain registered while WorkOrder has a relation to it.
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder,
      WorkOrderPart,
      WorkOrderStatusHistory,
      MaintenanceSchedule,
      Asset,
      User,
    ]),
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
