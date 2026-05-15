import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { loadEnvironment } from "../../common/config/env";
import { createBetterAuth } from "./auth.config";
import { BETTER_AUTH_TOKEN } from "./auth.tokens";
import { AUTH_REPOSITORY_PORT } from "./application/auth-repository.port";
import { AuthService } from "./application/auth.service";
import { CaptchaService } from "./application/captcha.service";
import { PasswordService } from "./application/password.service";
import { RoleService } from "./application/role.service";
import { SessionService } from "./application/session.service";
import { PrismaAuthRepository } from "./infrastructure/prisma-auth.repository";
import { AuthController } from "./interfaces/auth.controller";
import { AuthGuard } from "./interfaces/auth.guard";
import type { BetterAuthInstance } from "./auth.config";

export { BETTER_AUTH_TOKEN };

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: BETTER_AUTH_TOKEN,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): BetterAuthInstance => {
        const env = loadEnvironment();
        return createBetterAuth(prisma, {
          baseURL: env.betterAuthUrl,
          secret: env.betterAuthSecret,
          trustedOrigins: env.corsOrigins,
        });
      },
    },
    {
      provide: AUTH_REPOSITORY_PORT,
      useClass: PrismaAuthRepository,
    },
    AuthService,
    CaptchaService,
    PasswordService,
    RoleService,
    SessionService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [BETTER_AUTH_TOKEN, PasswordService, SessionService, RoleService],
})
export class AuthModule {}
