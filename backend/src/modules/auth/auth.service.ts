import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  // Authenticate user and issue JWT token
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }],
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role?.name || 'TECHNICIAN',
    };

    const accessToken = this.jwtService.sign(payload);
    const { passwordHash, ...userInfo } = user;

    return {
      accessToken,
      tokenType: 'Bearer',
      user: userInfo,
    };
  }

  // Get current user profile by user ID
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...userInfo } = user;
    return userInfo;
  }

  // Create a new user account (Admin only)
  async createUser(dto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ID ${dto.roleId} not found`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      passwordHash,
      role,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = savedUser;
    return result;
  }

  // List all users in system
  async findAllUsers() {
    const users = await this.userRepository.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });

    return users.map(({ passwordHash, ...user }) => user);
  }

  // List all available roles
  async findAllRoles() {
    return this.roleRepository.find({
      order: { id: 'ASC' },
    });
  }
}
