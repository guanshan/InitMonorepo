import { Inject, Injectable } from "@nestjs/common";

import {
  AUTH_REPOSITORY_PORT,
  type AuthRepositoryPort,
} from "./auth-repository.port";

// BetterAuth owns session creation and validation; this service only handles
// bulk revocation (used when a user is deactivated or changes their password).
@Injectable()
export class SessionService {
  constructor(
    @Inject(AUTH_REPOSITORY_PORT)
    private readonly authRepo: AuthRepositoryPort,
  ) {}

  async revokeAllForUser(userId: string): Promise<void> {
    await this.authRepo.revokeAllSessionsForUser(userId);
  }
}
