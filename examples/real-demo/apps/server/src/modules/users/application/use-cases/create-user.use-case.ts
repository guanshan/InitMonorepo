import type { CreateUserDraft } from "../../domain/user";
import type { UserRepository } from "../../domain/user.repository";

import { ConflictException, Inject, Injectable } from "@nestjs/common";

import { cacheKeys } from "../../../../common/cache/cache-keys";
import { CACHE_PORT, type CachePort } from "../../../../common/cache/cache.port";
import {
  DuplicateUserEmailError,
  USER_REPOSITORY,
} from "../../domain/user.repository";
import { serializeUserForCache } from "../user-cache-snapshot";

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
    @Inject(CACHE_PORT) private readonly cacheService: CachePort,
  ) {}

  async execute(input: CreateUserDraft) {
    try {
      const user = await this.repository.create(input);
      await this.cacheService.delete(cacheKeys.query.usersList());
      await this.cacheService.set(
        cacheKeys.entity.userById(user.id),
        serializeUserForCache(user),
        120,
      );
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
