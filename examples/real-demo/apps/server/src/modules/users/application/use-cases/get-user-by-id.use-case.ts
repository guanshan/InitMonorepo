import type { UserRepository } from "../../domain/user.repository";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { cacheKeys } from "../../../../common/cache/cache-keys";
import { CACHE_PORT, type CachePort } from "../../../../common/cache/cache.port";
import { USER_REPOSITORY } from "../../domain/user.repository";
import {
  deserializeCachedUser,
  serializeUserForCache,
} from "../user-cache-snapshot";

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
    @Inject(CACHE_PORT) private readonly cacheService: CachePort,
  ) {}

  async execute(id: string) {
    const cacheKey = cacheKeys.entity.userById(id);
    const cachedUser = deserializeCachedUser(
      await this.cacheService.get<ReturnType<typeof serializeUserForCache>>(cacheKey),
    );

    if (cachedUser) {
      return {
        cached: true,
        user: cachedUser,
      };
    }

    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundException({
        error: {
          code: "user_not_found",
          message: "The requested user could not be found.",
        },
        success: false,
      });
    }

    await this.cacheService.set(cacheKey, serializeUserForCache(user), 120);

    return {
      cached: false,
      user,
    };
  }
}
