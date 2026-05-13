import { createZodDto } from "nestjs-zod";

import {
  ApiFailureSchema,
  AuthStateResponseSchema,
  CaptchaChallengeResponseSchema,
  ChangePasswordInputSchema,
  ChangePasswordResponseSchema,
  DevAccountsResponseSchema,
  IoaStatusResponseSchema,
  SessionUserResponseSchema,
  SignInInputSchema,
} from "@real-demo/shared";

export { SignInInputSchema, ChangePasswordInputSchema };

export class SignInDto extends createZodDto(SignInInputSchema) {}
export class AuthStateResponseDto extends createZodDto(
  AuthStateResponseSchema,
) {}
export class SessionUserResponseDto extends createZodDto(
  SessionUserResponseSchema,
) {}
export class IoaStatusResponseDto extends createZodDto(
  IoaStatusResponseSchema,
) {}
export class DevAccountsResponseDto extends createZodDto(
  DevAccountsResponseSchema,
) {}
export class CaptchaChallengeResponseDto extends createZodDto(
  CaptchaChallengeResponseSchema,
) {}
export class AuthApiFailureDto extends createZodDto(ApiFailureSchema) {}

export class ChangePasswordDto extends createZodDto(
  ChangePasswordInputSchema,
) {}
export class ChangePasswordResponseDto extends createZodDto(
  ChangePasswordResponseSchema,
) {}
