import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceEventType } from '../entities/asset-history.entity';
import { AssetStatus } from '../../assets/entities/asset.entity';

export class CreateAssetHistoryDto {
  @IsNotEmpty({ message: 'assetId không được để trống' })
  @IsUUID('4')
  assetId: string;

  @IsOptional()
  @IsUUID('4')
  workOrderId?: string;

  @IsNotEmpty({ message: 'Loại sự kiện không được để trống' })
  @IsEnum(MaintenanceEventType)
  eventType: MaintenanceEventType;

  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  breakdownTime?: Date;

  @IsOptional()
  repairStartTime?: Date;

  @IsOptional()
  repairEndTime?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  downtimeHours?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualRepairTimeHours?: number = 0; // Trọng tâm tính MTTR

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operatingHoursAtFailure?: number = 0; // Trọng tâm tính MTBF

  @IsOptional()
  isFailureCounted?: boolean = false;

  @IsOptional()
  @IsString()
  failureCause?: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  statusBefore?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetStatus)
  statusAfter?: AssetStatus;

  @IsOptional()
  partsReplaced?: Array<{
    partId: string;
    partCode: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costParts?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costLabor?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalCost?: number = 0;

  @IsOptional()
  @IsUUID('4')
  performedById?: string;
}
