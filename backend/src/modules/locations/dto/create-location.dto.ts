import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsNotEmpty({ message: 'Mã vị trí không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @IsNotEmpty({ message: 'Tên vị trí không được để trống' })
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsUUID('4', { message: 'parentId phải là UUID hợp lệ' })
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
