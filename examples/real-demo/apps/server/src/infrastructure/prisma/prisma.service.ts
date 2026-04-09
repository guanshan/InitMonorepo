import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import pino from "pino";

import { loadEnvironment } from "../../common/config/env";
import { getRequestContext } from "../../common/http/request-context";

const SLOW_QUERY_THRESHOLD_MS = 250;

interface PrismaQueryEventLike {
  duration: number;
  query: string;
  target: string;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = pino({
    level: loadEnvironment().logLevel,
    messageKey: "message",
    formatters: {
      level: (label) => ({
        level: label,
      }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  });

  constructor() {
    super({
      datasources: {
        db: {
          url: loadEnvironment().databaseUrl,
        },
      },
      log: [
        {
          emit: "event",
          level: "query",
        },
      ],
    });

    this.$on(
      "query" as never,
      ((event: PrismaQueryEventLike) => {
        if (event.duration < SLOW_QUERY_THRESHOLD_MS) {
          return;
        }

        const requestId = getRequestContext()?.requestId;

        this.logger.warn(
          {
            action: "prisma.query",
            durationMs: event.duration,
            module: "database",
            query: event.query,
            target: event.target,
            ...(requestId ? { requestId } : {}),
            service: "real-demo-server",
          },
          "slow prisma query",
        );
      }) as never,
    );
  }

  async isReady() {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
