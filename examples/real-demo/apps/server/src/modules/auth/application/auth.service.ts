import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import {
  AUTH_REPOSITORY_PORT,
  type AuthRepositoryPort,
} from "./auth-repository.port";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY_PORT)
    private readonly authRepo: AuthRepositoryPort,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(SessionService) private readonly sessionService: SessionService,
  ) {}

  async validateSignIn(email: string): Promise<void> {
    const user = await this.authRepo.findUserByEmail(email.toLowerCase().trim());
    if (user && user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active.");
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const account = await this.authRepo.findAccountByUserIdAndProvider(
      userId,
      "credential",
    );

    if (!account?.password) {
      throw new BadRequestException(
        "No credential account found. Password change is not available for this account type.",
      );
    }

    const valid = await this.passwordService.verify(
      currentPassword,
      account.password,
    );
    if (!valid) {
      throw new BadRequestException("Current password is incorrect.");
    }

    const hashed = await this.passwordService.hash(newPassword);
    await this.authRepo.updateAccountPassword(account.id, hashed);
    await this.sessionService.revokeAllForUser(userId);
  }
}
