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
import { CaptchaService } from "./captcha.service";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";

interface SignInInput {
  email: string;
  password: string;
  captchaId: string;
  captchaAnswer: string;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY_PORT)
    private readonly authRepo: AuthRepositoryPort,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(CaptchaService) private readonly captchaService: CaptchaService,
  ) {}

  async signIn(input: SignInInput): Promise<{ token: string; userId: string }> {
    // Captcha is consumed before the password check so the rate cost of
    // brute-force attempts and unauthenticated probes is paid up front.
    await this.captchaService.verifyAndConsume(
      input.captchaId,
      input.captchaAnswer,
    );

    const user = await this.authRepo.findUserByEmail(
      input.email.toLowerCase().trim(),
    );

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active.");
    }

    const account = await this.authRepo.findAccountByUserIdAndProvider(
      user.id,
      "credential",
    );

    if (!account?.password) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordValid = await this.passwordService.verify(
      input.password,
      account.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.authRepo.updateUserLastLogin(user.id);

    const token = await this.sessionService.create({
      userId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { token, userId: user.userId };
  }

  async signOut(token: string): Promise<void> {
    await this.sessionService.revoke(token);
  }

  async changePassword(
    userId: number,
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
