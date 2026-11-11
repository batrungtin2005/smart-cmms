import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'True to activate, false to deactivate/suspend' })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}

