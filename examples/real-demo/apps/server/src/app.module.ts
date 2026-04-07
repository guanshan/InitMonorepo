import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { ZodSerializerInterceptor } from "nestjs-zod";

import { loadEnvironment } from "./common/config/env";
import { getLogAction, getLogModule } from "./common/http/log-context";
import { getOrCreateRequestId } from "./common/http/request-id";
import { CacheModule } from "./infrastructure/cache/cache.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (request) => getOrCreateRequestId(request),
        level: loadEnvironment().logLevel,
        messageKey: "message",
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.headers['x-api-key']",
            "res.headers['set-cookie']",
          ],
          remove: true,
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        customProps: (request) => {
          const pathname = (request.url ?? "/").split("?")[0] || "/";

          return {
            action: getLogAction(request.method, pathname),
            module: getLogModule(pathname),
            requestId: getOrCreateRequestId(request),
            service: "real-demo-server",
          };
        },
        formatters: {
          level: (label) => ({
            level: label,
          }),
        },
      },
    }),
    PrismaModule,
    CacheModule,
    HealthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
