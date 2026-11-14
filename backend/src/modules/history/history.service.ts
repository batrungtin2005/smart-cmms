import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssetHistory,
  MaintenanceEventType,
} from './entities/asset-history.entity';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';
import { CreateAssetHistoryDto } from './dto/create-history.dto';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  // Lấy toàn bộ timeline lịch sử của một thiết bị
  async getHistoryByAsset(assetId: string): Promise<AssetHistory[]> {
    return this.historyRepo.find({
      where: { assetId },
      relations: ['performedBy', 'workOrder'],
      order: { createdAt: 'DESC' },
    });
  }

  // Ghi nhật ký bảo trì / sửa chữa (được gọi từ WorkOrder hoặc ghi trực tiếp)
  async createHistoryLog(dto: CreateAssetHistoryDto): Promise<AssetHistory> {
    if (dto.workOrderId) {
      throw new BadRequestException('Work Order history is created through the verification API');
    }
    return this.assetRepo.manager.transaction(async manager => {
      const historyRepo = manager.getRepository(AssetHistory);
      const assetRepo = manager.getRepository(Asset);
      const asset = await assetRepo.findOne({ where: { id: dto.assetId }, lock: { mode: 'pessimistic_write' } });
      if (!asset) {
        throw new NotFoundException(`Không tìm thấy thiết bị với ID: ${dto.assetId}`);
      }

      const blockingWork = await manager.getRepository(WorkOrder).createQueryBuilder('wo')
        .where('wo.assetId = :assetId', { assetId: asset.id })
        .andWhere("wo.status NOT IN ('CLOSED', 'CANCELLED')").getExists();
      if (blockingWork) throw new ConflictException('Use Work Order verification while this asset has an open Work Order');

      // Tự động tính thời gian máy chạy giữa 2 lần hỏng (Time Between Failures - TBF)
      let timeBetweenFailuresHours: number | null = null;
      const isBreakdown =
        dto.eventType === MaintenanceEventType.BREAKDOWN ||
        dto.eventType === MaintenanceEventType.CORRECTIVE_REPAIR;

      if (isBreakdown) {
        // Tìm lần hỏng máy gần nhất trước đó
        const lastFailureLog = await historyRepo.findOne({
          where: {
            assetId: dto.assetId,
            isFailureCounted: true,
          },
          order: { createdAt: 'DESC' },
        });

        const currentOperatingHours =
          dto.operatingHoursAtFailure || Number(asset.operatingHours);

        if (lastFailureLog) {
          const lastOpHours = Number(lastFailureLog.operatingHoursAtFailure || 0);
          timeBetweenFailuresHours = Math.max(0, currentOperatingHours - lastOpHours);
        } else {
          // Lần hỏng đầu tiên: TBF chính là số giờ đã chạy từ khi lắp đặt
          timeBetweenFailuresHours = currentOperatingHours;
        }
      }

      // Tự động tính thời gian sửa chữa và downtime nếu có truyền timestamp
      let calculatedRepairTime = dto.actualRepairTimeHours || 0;
      if (!calculatedRepairTime && dto.repairStartTime && dto.repairEndTime) {
        const start = new Date(dto.repairStartTime).getTime();
        const end = new Date(dto.repairEndTime).getTime();
        calculatedRepairTime = Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
      }

      let calculatedDowntime = dto.downtimeHours || 0;
      if (!calculatedDowntime && dto.breakdownTime && dto.repairEndTime) {
        const bStart = new Date(dto.breakdownTime).getTime();
        const rEnd = new Date(dto.repairEndTime).getTime();
        calculatedDowntime = Number(((rEnd - bStart) / (1000 * 60 * 60)).toFixed(2));
      }

      const historyLog = historyRepo.create({
        ...dto,
        actualRepairTimeHours: calculatedRepairTime,
        downtimeHours: calculatedDowntime,
        operatingHoursAtFailure:
          dto.operatingHoursAtFailure || Number(asset.operatingHours),
        isFailureCounted: isBreakdown,
        timeBetweenFailuresHours,
      });

      const savedLog = await historyRepo.save(historyLog);

      // Cập nhật lại thống kê trên bảng Asset nếu là sự cố hỏng hóc
      if (isBreakdown) {
        asset.totalFailures = (asset.totalFailures || 0) + 1;
        asset.totalRepairTimeHours =
          Number(asset.totalRepairTimeHours || 0) + Number(calculatedRepairTime);
        asset.lastFailureDate = dto.breakdownTime || new Date();
        asset.status = dto.statusAfter || AssetStatus.OPERATIONAL;

        // Cập nhật chỉ số MTTR & MTBF lưu trữ
        const failures = await historyRepo.find({ where: { assetId: asset.id, isFailureCounted: true } });
        const repair = failures.reduce((sum, row) => sum + Number(row.actualRepairTimeHours), 0);
        const metrics = { mttrHours: failures.length ? repair / failures.length : 0,
          mtbfHours: failures.length ? Number(asset.operatingHours) / failures.length : Number(asset.operatingHours) };
        asset.cachedMttrHours = metrics.mttrHours;
        asset.cachedMtbfHours = metrics.mtbfHours;
        asset.metricsLastUpdatedAt = new Date();

        await assetRepo.save(asset);
      }

      return savedLog;
    });
  }

  // ================= TÍNH TOÁN CHỈ SỐ MTTR & MTBF CHUẨN XÁC =================
  async calculateMetricsForAsset(assetId: string) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException(`Không tìm thấy thiết bị với ID: ${assetId}`);
    }

    // Lấy tất cả các lần sửa chữa sự cố hỏng hóc
    const failureLogs = await this.historyRepo.find({
      where: {
        assetId,
        isFailureCounted: true,
      },
      order: { createdAt: 'ASC' },
    });

    const failureCount = failureLogs.length;

    // 1. Tính MTTR (Mean Time To Repair):
    // MTTR = Tổng thời gian sửa chữa thực tế / Số lần sửa chữa hỏng hóc
    const totalRepairTimeHours = failureLogs.reduce(
      (sum, log) => sum + Number(log.actualRepairTimeHours || 0),
      0,
    );
    const mttrHours =
      failureCount > 0 ? Number((totalRepairTimeHours / failureCount).toFixed(2)) : 0;

    // 2. Tính MTBF (Mean Time Between Failures):
    // MTBF = Tổng giờ hoạt động của máy (Operating Hours) / Số lần hỏng hóc
    const totalOperatingHours = Number(asset.operatingHours || 0);
    const mtbfHours =
      failureCount > 0
        ? Number((totalOperatingHours / failureCount).toFixed(2))
        : totalOperatingHours;

    // 3. Tính độ khả dụng (Availability - A):
    // Availability = MTBF / (MTBF + MTTR) * 100%
    let availabilityPercentage = 100;
    if (mtbfHours + mttrHours > 0) {
      availabilityPercentage = Number(
        ((mtbfHours / (mtbfHours + mttrHours)) * 100).toFixed(2),
      );
    }

    // Tổng thời gian ngừng máy (Total Downtime)
    const totalDowntimeHours = failureLogs.reduce(
      (sum, log) => sum + Number(log.downtimeHours || 0),
      0,
    );

    return {
      assetId: asset.id,
      assetCode: asset.assetCode,
      assetName: asset.name,
      operatingHours: totalOperatingHours,
      totalFailures: failureCount,
      totalRepairTimeHours: Number(totalRepairTimeHours.toFixed(2)),
      totalDowntimeHours: Number(totalDowntimeHours.toFixed(2)),
      mttrHours,               // Chỉ số MTTR (Giờ / lần sửa)
      mtbfHours,               // Chỉ số MTBF (Giờ hoạt động / lần hỏng)
      availabilityPercentage,  // Độ khả dụng (%)
      failureHistorySummary: failureLogs.map((log) => ({
        id: log.id,
        title: log.title,
        eventType: log.eventType,
        failureCause: log.failureCause,
        downtimeHours: Number(log.downtimeHours),
        actualRepairTimeHours: Number(log.actualRepairTimeHours),
        operatingHoursAtFailure: Number(log.operatingHoursAtFailure),
        timeBetweenFailuresHours: log.timeBetweenFailuresHours !== null
          ? Number(log.timeBetweenFailuresHours)
          : null,
        createdAt: log.createdAt,
      })),
    };
  }

  // ================= TÍNH TOÁN MTTR & MTBF TOÀN BỘ 300+ THIẾT BỊ =================
  async calculateAllAssetsReliability(locationId?: string) {
    const queryBuilder = this.assetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.location', 'location')
      .leftJoinAndSelect(
        'asset.historyLogs',
        'history',
        'history.isFailureCounted = :isFailure',
        { isFailure: true },
      )
      .where('asset.isActive = :isActive', { isActive: true });

    if (locationId) {
      queryBuilder.andWhere('asset.locationId = :locationId', { locationId });
    }

    const assets = await queryBuilder.orderBy('asset.assetCode', 'ASC').getMany();

    return assets.map((asset) => {
      const failures = asset.historyLogs || [];
      const failureCount = failures.length;
      const opHours = Number(asset.operatingHours || 0);

      const totalRepairTime = failures.reduce(
        (sum, item) => sum + Number(item.actualRepairTimeHours || 0),
        0,
      );

      const totalDowntime = failures.reduce(
        (sum, item) => sum + Number(item.downtimeHours || 0),
        0,
      );

      const mttr = failureCount > 0 ? Number((totalRepairTime / failureCount).toFixed(2)) : 0;
      const mtbf = failureCount > 0 ? Number((opHours / failureCount).toFixed(2)) : opHours;

      let availability = 100.0;
      if (failureCount > 0 && mtbf + mttr > 0) {
        availability = Number(((mtbf / (mtbf + mttr)) * 100).toFixed(2));
      }

      const lastFailureLog = failures.sort(
        (a, b) =>
          new Date(b.breakdownTime || b.createdAt).getTime() -
          new Date(a.breakdownTime || a.createdAt).getTime(),
      )[0];

      return {
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        category: asset.category,
        locationName: asset.location ? asset.location.name : null,
        status: asset.status,
        operatingHours: opHours,
        totalFailures: failureCount,
        totalRepairTimeHours: Number(totalRepairTime.toFixed(2)),
        totalDowntimeHours: Number(totalDowntime.toFixed(2)),
        mttrHours: mttr,
        mtbfHours: mtbf,
        availabilityPercentage: availability,
        lastFailureDate: lastFailureLog
          ? lastFailureLog.breakdownTime || lastFailureLog.createdAt
          : null,
      };
    });
  }
}
