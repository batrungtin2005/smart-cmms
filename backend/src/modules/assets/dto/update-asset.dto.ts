import { PartialType } from '@nestjs/swagger';
import { CreateAssetDto } from './create-asset.dto';

// Kế thừa CreateAssetDto, tất cả fields đều optional
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
