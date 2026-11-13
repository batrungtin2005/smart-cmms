import { AssetHistory } from "../history/entities/asset-history.entity";
import { MaterialRequest } from "./entities/material-request.entity";
import { MaterialRequestItem } from "./entities/material-request-item.entity";
import { MaterialRequestsService } from "./material-requests.service";
import { MaterialRequestsController } from "./material-requests.controller";
import { Part } from "../parts/entities/part.entity";
import { PartTransaction } from "../parts/entities/part-transaction.entity";
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
      MaterialRequest,
      MaterialRequestItem,
      Part,
      PartTransaction,
      WorkOrder,
      WorkOrderPart,
      WorkOrderStatusHistory,
      MaintenanceSchedule,
      Asset,
      AssetHistory,
      User,
    ]),
  ],
  controllers: [WorkOrdersController, MaterialRequestsController],
  providers: [WorkOrdersService, MaterialRequestsService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
