import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nguyen Van An', description: 'Full name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 3, description: 'Role ID from GET /auth/roles (ADMIN, MAINTENANCE_MANAGER, TECHNICIAN, WAREHOUSE_KEEPER); IDs depend on database data' })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiPropertyOptional({ example: true, description: 'User account active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

