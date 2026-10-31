import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(this.configService.get<string>('REDIS_PORT', '6379'), 10);
    const password = this.configService.get<string>('REDIS_PASSWORD', undefined);

    try {
      this.client = new Redis({
        host,
        port,
        password,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(`⚠️ Không thể kết nối Redis tại ${host}:${port}. Chuyển sang chế độ Fallback trực tiếp DB.`);
            return null; // Dừng retry để không làm chậm server
          }
          return Math.min(times * 1000, 3000);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      this.client
        .connect()
        .then(() => {
          this.isConnected = true;
          this.logger.log(`🚀 Đã kết nối Redis Cache thành công tại ${host}:${port}`);
        })
        .catch((err) => {
          this.isConnected = false;
          this.logger.warn(`⚠️ Redis tạm thời chưa khả dụng: ${err.message}. Hệ thống vẫn hoạt động bình thường qua PostgreSQL.`);
        });

      this.client.on('error', (err) => {
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });
    } catch (error) {
      this.logger.warn(`⚠️ Khởi tạo Redis thất bại: ${error.message}`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  // 1. LẤY DỮ LIỆU TỪ CACHE
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Lỗi khi đọc cache key '${key}': ${error.message}`);
      return null;
    }
  }

  // 2. LƯU DỮ LIỆU VÀO CACHE KÈM THỜI GIAN HẾT HẠN (TTL TÍNH THEO GIÂY)
  async set(key: string, value: any, ttlSeconds = 120): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi ghi cache key '${key}': ${error.message}`);
    }
  }

  // 3. XÓA 1 KEY CACHE
  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa cache key '${key}': ${error.message}`);
    }
  }

  // 4. XÓA CACHE THEO PATTERN (DÙNG CHO CACHE INVALIDATION KHI CẬP NHẬT DỮ LIỆU)
  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          const pipeline = this.client!.pipeline();
          keys.forEach((k) => pipeline.del(k));
          await pipeline.exec();
        }
      });
    } catch (error) {
      this.logger.error(`Lỗi khi xóa cache pattern '${pattern}': ${error.message}`);
    }
  }
}
