import type { UserRepository } from "../../domain/user.repository";
import type { User } from "../../domain/user";

import { Inject, Injectable } from "@nestjs/common";

import { cacheKeys } from "../../../../common/cache/cache-keys";
import { CACHE_PORT, type CachePort } from "../../../../common/cache/cache.port";
import { USER_REPOSITORY } from "../../domain/user.repository";
import {
  deserializeCachedUsers,
  serializeUsersForCache,
} from "../user-cache-snapshot";

interface ListUsersResult {
  cached: boolean;
  users: User[];
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
    @Inject(CACHE_PORT) private readonly cacheService: CachePort,
  ) {}

  async execute(): Promise<ListUsersResult> {
    const cachedUsers = await this.cacheService.get<
      ReturnType<typeof serializeUsersForCache>
    >(cacheKeys.query.usersList());

    if (cachedUsers) {
      return {
        cached: true,
        users: deserializeCachedUsers(cachedUsers),
      };
    }

    const users = await this.repository.list();
    await this.cacheService.set(
      cacheKeys.query.usersList(),
      serializeUsersForCache(users),
      120,
    );

    return {
      cached: false,
      users,
    };
  }
}
