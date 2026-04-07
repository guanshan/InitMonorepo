import {
  ApiFailureSchema,
  CreateUserInputSchema,
  CreateUserResponseSchema,
  UserDetailResponseSchema,
  UserListResponseSchema,
  UserSchema,
} from "@real-demo/shared";
import { createZodDto } from "nestjs-zod";

/**
 * DTOs derived from Zod schemas — single source of truth.
 * nestjs-zod automatically generates OpenAPI schemas from these.
 */
export class UserDto extends createZodDto(UserSchema) {}

export class CreateUserDto extends createZodDto(CreateUserInputSchema) {}

export class UserListResponseDto extends createZodDto(UserListResponseSchema) {}

export class UserDetailResponseDto extends createZodDto(UserDetailResponseSchema) {}

export class CreateUserResponseDto extends createZodDto(CreateUserResponseSchema) {}

export class ApiFailureDto extends createZodDto(ApiFailureSchema) {}
