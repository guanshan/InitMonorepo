import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { SETTINGS_REPOSITORY_PORT } from "./application/settings-repository.port";
import { SettingsService } from "./application/settings.service";
import { PrismaSettingsRepository } from "./infrastructure/prisma-settings.repository";
import { SettingsController } from "./interfaces/settings.controller";

@Module({
  imports: [AuthModule],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    {
      provide: SETTINGS_REPOSITORY_PORT,
      useClass: PrismaSettingsRepository,
    },
  ],
})
export class SettingsModule {}
