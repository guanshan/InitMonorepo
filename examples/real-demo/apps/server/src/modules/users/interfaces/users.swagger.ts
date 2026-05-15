import {
  AdminUserListQuerySchema,
  AdminUserListResponseSchema,
  AdminUserMutationResponseSchema,
  AdminUserResponseSchema,
  ApiFailureSchema,
  CreateAdminUserInputSchema,
  ResetAdminUserPasswordInputSchema,
  UpdateAdminUserInputSchema,
} from "@real-demo/shared";
import { createZodDto } from "nestjs-zod";

export {
  AdminUserListQuerySchema,
  CreateAdminUserInputSchema,
  ResetAdminUserPasswordInputSchema,
  UpdateAdminUserInputSchema,
};

export class CreateAdminUserDto extends createZodDto(
  CreateAdminUserInputSchema,
) {}
export class UpdateAdminUserDto extends createZodDto(
  UpdateAdminUserInputSchema,
) {}
export class ResetAdminUserPasswordDto extends createZodDto(
  ResetAdminUserPasswordInputSchema,
) {}
export class AdminUserListQueryDto extends createZodDto(
  AdminUserListQuerySchema,
) {}

export class AdminUserResponseDto extends createZodDto(AdminUserResponseSchema) {}
export class AdminUserListResponseDto extends createZodDto(
  AdminUserListResponseSchema,
) {}
export class AdminUserMutationResponseDto extends createZodDto(
  AdminUserMutationResponseSchema,
) {}
export class UsersApiFailureDto extends createZodDto(ApiFailureSchema) {}
