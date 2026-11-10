import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Auto-seed default roles and initial admin user on application startup (Resolves Issue #20)
  async onApplicationBootstrap() {
    await this.seedDefaultRolesAndAdmin();
  }

  // Seed default roles & initial admin user if not present
  async seedDefaultRolesAndAdmin() {
    try {
      const defaultRoles = [
        { name: 'ADMIN', description: 'Quản trị hệ thống' },
        { name: 'MAINTENANCE_MANAGER', description: 'Quản lý bảo trì' },
        { name: 'TECHNICIAN', description: 'Kỹ thuật viên hiện trường' },
      ];

      for (const roleData of defaultRoles) {
        const existingRole = await this.roleRepository.findOne({
          where: { name: roleData.name },
        });
        if (!existingRole) {
          await this.roleRepository.save(this.roleRepository.create(roleData));
          this.logger.log(`[Seed] Created default role: ${roleData.name}`);
        }
      }

      // Check if admin user exists
      const adminRole = await this.roleRepository.findOne({
        where: { name: 'ADMIN' },
      });

      if (adminRole) {
        const adminUser = await this.userRepository.findOne({
          where: [{ username: 'admin' }, { email: 'admin@smartcmms.com' }],
        });

        if (!adminUser) {
          const defaultPassword = this.configService.get<string>(
            'DEFAULT_ADMIN_PASSWORD',
            'Admin@123456',
          );
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(defaultPassword, salt);

          const newAdmin = this.userRepository.create({
            username: 'admin',
            email: 'admin@smartcmms.com',
            fullName: 'System Administrator',
            phoneNumber: '0901234567',
            passwordHash,
            role: adminRole,
            isActive: true,
          });

          await this.userRepository.save(newAdmin);
          this.logger.log(
            `[Seed] Created default admin account: username='admin' (Password configured)`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `[Seed] Could not seed default roles/admin: ${error.message}`,
      );
    }
  }

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

  // Update user profile or role (Admin only)
  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }
    if (dto.phoneNumber !== undefined) {
      user.phoneNumber = dto.phoneNumber;
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    if (dto.roleId !== undefined) {
      const role = await this.roleRepository.findOne({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundException(`Role ID ${dto.roleId} not found`);
      }
      user.role = role;
    }

    const updatedUser = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = updatedUser;
    return result;
  }

  // Activate or deactivate user account (Admin only)
  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.isActive = isActive;
    const updatedUser = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = updatedUser;
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
