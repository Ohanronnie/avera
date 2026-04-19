import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(
      this.configService.getOrThrow<string>('REDIS_URL') as string,
    );
  }

  /**
   * Sets a key-value pair in Redis with an optional TTL (time-to-live).
   * @param key The key to set.
   * @param value The value to set.
   * @param ttl Time-to-live in seconds (optional).
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl); // 'EX' sets the TTL in seconds
    } else {
      await this.client.set(key, value); // No TTL
    }
  }

  /**
   * Deletes a key from Redis.
   * @param key The key to delete.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Retrieves a value by key from Redis.
   * @param key The key to retrieve.
   * @returns The value associated with the key, or null if not found.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Retrieves the remaining TTL for a key in seconds.
   * @param key The key to inspect.
   * @returns Remaining TTL in seconds, or -1/-2 based on Redis semantics.
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Disconnects the Redis client when the module is destroyed.
   */
  onModuleDestroy() {
    this.client.disconnect();
  }
}
