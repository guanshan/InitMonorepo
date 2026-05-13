import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AUTH_REPOSITORY_PORT } from "./application/auth-repository.port";
import { AuthService } from "./application/auth.service";
import { CaptchaService } from "./application/captcha.service";
import { PasswordService } from "./application/password.service";
import { RoleService } from "./application/role.service";
import { SessionService } from "./application/session.service";
import { PrismaAuthRepository } from "./infrastructure/prisma-auth.repository";
import { AuthController } from "./interfaces/auth.controller";
import { AuthGuard } from "./interfaces/auth.guard";

@Module({
  controllers: [AuthController],
  providers: [
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
  exports: [PasswordService, SessionService, RoleService],
})
export class AuthModule {}
