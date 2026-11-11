import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'tech_an', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'tech.an@zentech.vn', description: 'User work email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'Initial password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Nguyen Van An', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Contact phone' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 3, description: 'Role ID from GET /auth/roles (ADMIN, MAINTENANCE_MANAGER, TECHNICIAN, WAREHOUSE_KEEPER); IDs depend on database data' })
  @IsInt()
  @IsNotEmpty()
  roleId: number;
}
