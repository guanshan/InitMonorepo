import type {
  ListUsersInput,
  UserRepository,
} from "../../domain/user.repository";
import type { User } from "../../domain/user";

import { Inject, Injectable } from "@nestjs/common";

import { cacheKeys } from "../../../../common/cache/cache-keys";
import {
  CACHE_PORT,
  type CachePort,
} from "../../../../common/cache/cache.port";
import { USER_REPOSITORY } from "../../domain/user.repository";
import {
  deserializeCachedUsersPage,
  serializeUsersPageForCache,
} from "../user-cache-snapshot";

const USERS_LIST_CACHE_TTL_SECONDS = 120;

interface ListUsersResult {
  cached: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  users: User[];
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
    @Inject(CACHE_PORT) private readonly cacheService: CachePort,
  ) {}

  async execute({ page, pageSize }: ListUsersInput): Promise<ListUsersResult> {
    const cacheVersion =
      (await this.cacheService.get<number>(
        cacheKeys.query.usersListVersion(),
      )) ?? 0;
    const cachedUsersPage = deserializeCachedUsersPage(
      await this.cacheService.get<
        ReturnType<typeof serializeUsersPageForCache>
      >(cacheKeys.query.usersListPage(cacheVersion, page, pageSize)),
    );

    if (cachedUsersPage) {
      return {
        cached: true,
        page,
        pageSize,
        totalItems: cachedUsersPage.totalItems,
        users: cachedUsersPage.users,
      };
    }

    const { totalItems, users } = await this.repository.list({
      page,
      pageSize,
    });
    await this.cacheService.set(
      cacheKeys.query.usersListPage(cacheVersion, page, pageSize),
      serializeUsersPageForCache(users, totalItems),
      USERS_LIST_CACHE_TTL_SECONDS,
    );

    return {
      cached: false,
      page,
      pageSize,
      totalItems,
      users,
    };
  }
}
