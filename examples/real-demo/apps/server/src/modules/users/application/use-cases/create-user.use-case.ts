import type { CreateUserDraft } from "../../domain/user";
import type { UserRepository } from "../../domain/user.repository";

import { ConflictException, Inject, Injectable, Logger } from "@nestjs/common";

import { cacheKeys } from "../../../../common/cache/cache-keys";
import {
  CACHE_PORT,
  type CachePort,
} from "../../../../common/cache/cache.port";
import {
  DuplicateUserEmailError,
  USER_REPOSITORY,
} from "../../domain/user.repository";
import { serializeUserForCache } from "../user-cache-snapshot";

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
    @Inject(CACHE_PORT) private readonly cacheService: CachePort,
  ) {}

  async execute(input: CreateUserDraft) {
    try {
      const user = await this.repository.create(input);
      const [usersListCacheVersion] = await Promise.all([
        this.cacheService.increment(cacheKeys.query.usersListVersion(), 3600),
        this.cacheService.set(
          cacheKeys.entity.userById(user.id),
          serializeUserForCache(user),
          120,
        ),
      ]);

      if (usersListCacheVersion === null) {
        this.logger.warn(
          `Cache version increment returned null for users-list-version-increment (userId=${user.id}). ` +
            `Redis may be unavailable; stale list pages could persist until their TTL expires.`,
        );
      }

      return user;
    } catch (error) {
      if (error instanceof DuplicateUserEmailError) {
        throw new ConflictException({
          error: {
            code: "user_conflict",
            message: error.message,
          },
          success: false,
        });
      }

      throw error;
    }
  }
}
