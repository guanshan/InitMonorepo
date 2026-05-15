import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CryptoService } from "./application/crypto.service";
import { ModelsService } from "./application/models.service";
import { MODELS_REPOSITORY_PORT } from "./application/models.repository.port";
import { ProviderResolver } from "./application/provider-resolver";
import { ProvidersService } from "./application/providers.service";
import { PROVIDERS_REPOSITORY_PORT } from "./application/providers.repository.port";
import { PrismaModelsRepository } from "./infrastructure/prisma-models.repository";
import { PrismaProvidersRepository } from "./infrastructure/prisma-providers.repository";
import { ConfigController } from "./interfaces/config.controller";
import { ModelsController } from "./interfaces/models.controller";
import { PlaygroundController } from "./interfaces/playground.controller";
import { ProvidersController } from "./interfaces/providers.controller";

@Module({
  imports: [AuthModule],
  controllers: [
    ModelsController,
    ProvidersController,
    PlaygroundController,
    ConfigController,
  ],
  providers: [
    CryptoService,
    { provide: PROVIDERS_REPOSITORY_PORT, useClass: PrismaProvidersRepository },
    { provide: MODELS_REPOSITORY_PORT, useClass: PrismaModelsRepository },
    ProviderResolver,
    ProvidersService,
    ModelsService,
  ],
})
export class ModelsModule {}
