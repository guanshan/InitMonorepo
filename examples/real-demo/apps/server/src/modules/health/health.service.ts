import { Inject, Injectable } from "@nestjs/common";

import { CACHE_PORT, type CachePort } from "../../common/cache/cache.port";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(CACHE_PORT) private readonly cacheService: CachePort,
  ) {}

  createLivenessSnapshot() {
    return {
      status: "ok",
    } as const;
  }

  async createReadinessSnapshot() {
    const [databaseReady, cacheReady] = await Promise.all([
      this.prismaService.isReady(),
      this.cacheService.isReady(),
    ]);

    return {
      ready: databaseReady && cacheReady,
      services: {
        cache: cacheReady ? "up" : "down",
        database: databaseReady ? "up" : "down",
      },
    } as const;
  }
}
