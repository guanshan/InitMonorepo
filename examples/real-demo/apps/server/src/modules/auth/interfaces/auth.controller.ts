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

import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "../../../common/http/request-id";
import { successResponse } from "../../../common/http/success-response";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { loadEnvironment } from "../../../common/config/env";
import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_COOKIE_PATH,
  AUTH_SESSION_TTL_MS,
  type SessionUserInternal,
} from "../domain/auth.types";
import { AuthService } from "../application/auth.service";
import { CaptchaService } from "../application/captcha.service";
import { CurrentUser } from "./auth.decorator";
import { Public } from "./auth.guard";
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

const getClientIp = (request: Request) =>
  request.ip?.trim() || request.socket?.remoteAddress?.trim() || "unknown";

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

const setSessionCookie = (response: Response, token: string) => {
  const env = loadEnvironment();
  response.cookie(AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: AUTH_SESSION_COOKIE_PATH,
    maxAge: AUTH_SESSION_TTL_MS,
  });
};

const clearSessionCookie = (response: Response) => {
  response.clearCookie(AUTH_SESSION_COOKIE_NAME, {
    path: AUTH_SESSION_COOKIE_PATH,
  });
};

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
    const result = await this.authService.signIn({
      email: body.email,
      password: body.password,
      captchaId: body.captchaId,
      captchaAnswer: body.captchaAnswer,
      ipAddress: getClientIp(request),
      userAgent: request.headers["user-agent"] ?? "",
    });

    setSessionCookie(response, result.token);

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
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[AUTH_SESSION_COOKIE_NAME];

    if (token) {
      await this.authService.signOut(token);
    }

    clearSessionCookie(response);

    return successResponse(
      { authenticated: false },
      {
        requestId: getOrCreateRequestId(
          request as unknown as RequestWithRequestId,
        ),
      },
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

    clearSessionCookie(response);

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
    // iOA SSO is a Tencent-internal SSO scheme; the demo keeps the endpoint
    // wired up so callers can probe it, but it never advertises itself.
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
