import { Global, Module } from "@nestjs/common";

import { CACHE_PORT } from "../../common/cache/cache.port";
import { CacheService } from "./cache.service";

@Global()
@Module({
  providers: [
    CacheService,
    {
      provide: CACHE_PORT,
      useExisting: CacheService,
    },
  ],
  exports: [CacheService, CACHE_PORT],
})
export class CacheModule {}
