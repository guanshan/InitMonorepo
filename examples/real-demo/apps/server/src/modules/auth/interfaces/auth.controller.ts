import type { Request, Response } from "express";

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExcludeEndpoint,
  ApiExtraModels,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { fromNodeHeaders } from "better-auth/node";

import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "../../../common/http/request-id";
import { successResponse } from "../../../common/http/success-response";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { loadEnvironment } from "../../../common/config/env";
import { type SessionUserInternal } from "../domain/auth.types";
import { AuthService } from "../application/auth.service";
import { CaptchaService } from "../application/captcha.service";
import { CurrentUser } from "./auth.decorator";
import { Public } from "./auth.guard";
import { BETTER_AUTH_TOKEN } from "../auth.tokens";
import type { BetterAuthInstance } from "../auth.config";
import {
  AuthApiFailureDto,
  AuthStateResponseDto,
  CaptchaChallengeResponseDto,
  ChangePasswordDto,
  ChangePasswordInputSchema,
  ChangePasswordResponseDto,
  DevAccountsResponseDto,
  IoaStatusResponseDto,
  SessionUserResponseDto,
  SignInDto,
  SignInInputSchema,
} from "./auth.swagger";

// Kept in sync with prisma/seed.ts so the dev-login shortcut maps to real
// accounts. Production must keep AUTH_DEV_LOGIN_ENABLED=false (default).
const DEV_ACCOUNTS = [
  {
    role: "SUPER_ADMIN" as const,
    email: "superadmin@local.auth",
    password: "Demo#2026.",
  },
  {
    role: "ADMIN" as const,
    email: "admin@local.auth",
    password: "Demo#2026.",
  },
  {
    role: "USER" as const,
    email: "user@local.auth",
    password: "User#2026.",
  },
];

@ApiTags("auth")
@ApiExtraModels(
  SignInDto,
  AuthStateResponseDto,
  SessionUserResponseDto,
  IoaStatusResponseDto,
  CaptchaChallengeResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
  AuthApiFailureDto,
)
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(CaptchaService) private readonly captchaService: CaptchaService,
    @Inject(BETTER_AUTH_TOKEN) private readonly auth: BetterAuthInstance,
  ) {}

  @Public()
  @Post("captcha")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "issueSignInCaptcha",
    summary: "Issue a graphical CAPTCHA for sign-in",
  })
  @ZodResponse({
    description: "Returns an SVG CAPTCHA challenge",
    status: 200,
    type: CaptchaChallengeResponseDto,
  })
  @ApiServiceUnavailableResponse({ type: AuthApiFailureDto })
  async issueSignInCaptcha(@Req() request: Request & RequestWithRequestId) {
    const challenge = await this.captchaService.issue();
    return successResponse(challenge, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Public()
  @Post("sign-in")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "signIn",
    summary: "Sign in with email and password",
  })
  @ApiBody({ type: SignInDto })
  @ZodResponse({
    description: "Returns whether the request established a session",
    status: 200,
    type: AuthStateResponseDto,
  })
  @ApiUnauthorizedResponse({ type: AuthApiFailureDto })
  @ApiBadRequestResponse({ type: AuthApiFailureDto })
  @ApiServiceUnavailableResponse({ type: AuthApiFailureDto })
  async signIn(
    @Body(new ZodValidationPipe(SignInInputSchema)) body: SignInDto,
    @Req() request: Request & RequestWithRequestId,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Captcha must be verified before delegating to BetterAuth so the rate
    // cost of brute-force probes is paid up front, regardless of whether the
    // credentials are valid.
    await this.captchaService.verifyAndConsume(body.captchaId, body.captchaAnswer);
    // Reject inactive/suspended accounts before BetterAuth creates a session.
    await this.authService.validateSignIn(body.email);

    const baResponse = await this.auth.api.signInEmail({
      body: { email: body.email, password: body.password },
      headers: fromNodeHeaders(request.headers),
      asResponse: true,
    });

    if (!baResponse.ok) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const setCookies = baResponse.headers.getSetCookie();
    if (setCookies.length > 0) {
      response.setHeader("set-cookie", setCookies);
    }

    return successResponse(
      { authenticated: true },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Public()
  @Post("sign-out")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "signOut", summary: "Sign out" })
  @ZodResponse({
    description:
      "Returns whether the request still has an authenticated session",
    status: 200,
    type: AuthStateResponseDto,
  })
  async signOut(
    @Req() request: Request & RequestWithRequestId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const baResponse = await this.auth.api.signOut({
      headers: fromNodeHeaders(request.headers),
      asResponse: true,
    });

    const setCookies = baResponse.headers.getSetCookie();
    if (setCookies.length > 0) {
      response.setHeader("set-cookie", setCookies);
    }

    return successResponse(
      { authenticated: false },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Get("me")
  @ApiOperation({
    operationId: "getCurrentUser",
    summary: "Get current session user",
  })
  @ZodResponse({
    description: "Returns the current authenticated user",
    status: 200,
    type: SessionUserResponseDto,
  })
  @ApiUnauthorizedResponse({ type: AuthApiFailureDto })
  async getCurrentUser(
    @CurrentUser() user: SessionUserInternal,
    @Req() request: Request & RequestWithRequestId,
  ) {
    return successResponse(
      {
        userId: user.userId,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        baseRole: user.baseRole,
        roleSource: user.roleSource,
        department: user.department,
        status: user.status,
        image: user.image,
      },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "changePassword",
    summary: "Change password for the current user",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ZodResponse({
    description: "Returns whether the password was changed",
    status: 200,
    type: ChangePasswordResponseDto,
  })
  @ApiBadRequestResponse({ type: AuthApiFailureDto })
  @ApiUnauthorizedResponse({ type: AuthApiFailureDto })
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordInputSchema))
    body: ChangePasswordDto,
    @CurrentUser() user: SessionUserInternal,
    @Req() request: Request & RequestWithRequestId,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );

    // All sessions were revoked inside changePassword; clear the cookie too.
    const baResponse = await this.auth.api.signOut({
      headers: fromNodeHeaders(request.headers),
      asResponse: true,
    });
    const setCookies = baResponse.headers.getSetCookie();
    if (setCookies.length > 0) {
      response.setHeader("set-cookie", setCookies);
    }

    return successResponse(
      { changed: true },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Public()
  @Get("sign-in/ioa/status")
  @ApiOperation({
    operationId: "getIoaLoginStatus",
    summary: "Check if iOA login is enabled",
  })
  @ZodResponse({
    description: "Returns whether iOA sign-in is enabled",
    status: 200,
    type: IoaStatusResponseDto,
  })
  getIoaLoginStatus(@Req() request: Request & RequestWithRequestId) {
    return successResponse(
      { enabled: false },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Public()
  @Get("dev-accounts")
  @ApiExcludeEndpoint()
  getDevAccounts(@Req() request: Request & RequestWithRequestId) {
    const env = loadEnvironment();
    const enabled = env.authDevLoginEnabled && env.nodeEnv !== "production";
    const accounts = enabled ? DEV_ACCOUNTS : [];
    return successResponse(
      { accounts } satisfies DevAccountsResponseDto["data"],
      { requestId: getOrCreateRequestId(request) },
    );
  }
}
