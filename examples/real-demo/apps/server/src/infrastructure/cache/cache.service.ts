import type { RedisClientType } from "redis";

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { createClient } from "redis";

import type { CachePort } from "../../common/cache/cache.port";
import { loadEnvironment } from "../../common/config/env";

@Injectable()
export class CacheService implements CachePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  private client: RedisClientType | null = null;

  async onModuleInit() {
    const environment = loadEnvironment();

    this.client = createClient({
      url: environment.redisUrl,
    });

    this.client.on("error", (error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.warn(
        `Redis connection skipped: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async delete(key: string) {
    if (!this.client?.isOpen) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(
        `Redis delete failed for key "${key}": ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  async isReady() {
    if (!this.client?.isOpen) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.warn(
        `Redis readiness check failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      return false;
    }
  }

  async get<TValue>(key: string) {
    if (!this.client?.isOpen) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as TValue) : null;
    } catch (error) {
      this.logger.warn(
        `Redis get failed for key "${key}": ${error instanceof Error ? error.message : "unknown error"}`,
      );
      return null;
    }
  }

  async increment(key: string, ttlSeconds = 60) {
    if (!this.client?.isOpen) {
      return null;
    }

    try {
      const value = await this.client.eval(
        `local c = redis.call('INCR', KEYS[1]) if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return c`,
        { keys: [key], arguments: [String(ttlSeconds)] },
      );

      return typeof value === "number" ? value : null;
    } catch (error) {
      this.logger.warn(
        `Redis increment failed for key "${key}": ${error instanceof Error ? error.message : "unknown error"}`,
      );
      return null;
    }
  }

  async set<TValue>(key: string, value: TValue, ttlSeconds = 60) {
    if (!this.client?.isOpen) {
      return;
    }

    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
    } catch (error) {
      this.logger.warn(
        `Redis set failed for key "${key}": ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }
}
