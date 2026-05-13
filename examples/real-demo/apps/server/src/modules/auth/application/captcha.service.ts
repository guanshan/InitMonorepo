import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import svgCaptcha from "svg-captcha";

import { loadEnvironment } from "../../../common/config/env";

import {
  CACHE_PORT,
  CacheUnavailableError,
  type CachePort,
} from "../../../common/cache/cache.port";
import { cacheKeys } from "../../../common/cache/cache-keys";

export interface CaptchaChallenge {
  captchaId: string;
  svg: string;
}

const CAPTCHA_TTL_SECONDS = 5 * 60;
const CAPTCHA_ID_BYTES = 16;

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(@Inject(CACHE_PORT) private readonly cache: CachePort) {}

  async issue(): Promise<CaptchaChallenge> {
    const challenge = svgCaptcha.create({
      size: 5,
      noise: 3,
      color: true,
      ignoreChars: "0oO1ilLI",
      background: "#f2f3f5",
    });

    const captchaId = randomBytes(CAPTCHA_ID_BYTES).toString("hex");

    try {
      // setStrict fails closed when Redis is unavailable, so we never hand out
      // a challenge that can never be verified — that would surface as a
      // misleading "captcha_expired" later.
      await this.cache.setStrict(
        cacheKeys.auth.captchaById(captchaId),
        challenge.text.toLowerCase(),
        CAPTCHA_TTL_SECONDS,
      );
    } catch (error) {
      if (error instanceof CacheUnavailableError) {
        this.logger.error(
          `Captcha issue failed due to cache unavailability: ${error.message}`,
        );
        throw new ServiceUnavailableException({
          code: "captcha_unavailable",
          message:
            "Captcha service is temporarily unavailable. Please retry later.",
        });
      }

      throw error;
    }

    return { captchaId, svg: challenge.data };
  }

  /**
   * GETDEL ensures the challenge is consumed atomically — concurrent verify
   * attempts for the same captchaId can't both succeed, blocking replay.
   */
  async verifyAndConsume(captchaId: string, answer: string): Promise<void> {
    const normalizedId = captchaId.trim();
    const normalizedAnswer = answer.trim().toLowerCase();

    if (!normalizedId || !normalizedAnswer) {
      throw new BadRequestException({
        code: "captcha_invalid",
        message: "Captcha is required.",
      });
    }

    // Local dev one-click login bypass; requires AUTH_DEV_LOGIN_ENABLED and
    // a non-production node env so it can't accidentally ship to staging.
    const env = loadEnvironment();
    if (
      env.authDevLoginEnabled &&
      env.nodeEnv !== "production" &&
      normalizedId === "__dev_bypass__"
    ) {
      return;
    }

    let expected: string | null;
    try {
      expected = await this.cache.getAndDelete<string>(
        cacheKeys.auth.captchaById(normalizedId),
      );
    } catch (error) {
      if (error instanceof CacheUnavailableError) {
        this.logger.error(
          `Captcha verify failed due to cache unavailability: ${error.message}`,
        );
        throw new ServiceUnavailableException({
          code: "captcha_unavailable",
          message:
            "Captcha service is temporarily unavailable. Please retry later.",
        });
      }

      throw error;
    }

    if (!expected) {
      throw new BadRequestException({
        code: "captcha_expired",
        message: "Captcha has expired. Please refresh and try again.",
      });
    }

    if (expected !== normalizedAnswer) {
      throw new BadRequestException({
        code: "captcha_invalid",
        message: "Captcha answer is incorrect.",
      });
    }
  }
}
