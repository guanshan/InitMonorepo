import type { RedisClientType } from "redis";

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
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

    await this.client.del(key);
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

    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as TValue) : null;
  }

  async set<TValue>(key: string, value: TValue, ttlSeconds = 60) {
    if (!this.client?.isOpen) {
      return;
    }

    await this.client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  }
}
