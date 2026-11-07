import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username or email address' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Password@123', description: 'User account password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
