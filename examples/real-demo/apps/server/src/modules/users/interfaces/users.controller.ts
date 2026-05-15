import type { Request } from "express";

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AdminUser } from "@real-demo/shared";
import { ZodResponse } from "nestjs-zod";

import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "../../../common/http/request-id";
import {
  paginatedResponse,
  successResponse,
} from "../../../common/http/success-response";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import type { SessionUserInternal } from "../../auth/domain/auth.types";
import { CurrentUser } from "../../auth/interfaces/auth.decorator";
import { Roles } from "../../auth/interfaces/auth.guard";
import { UsersService } from "../application/users.service";
import type { AdminUserRecord } from "../application/users-repository.port";
import {
  AdminUserListQueryDto,
  AdminUserListQuerySchema,
  AdminUserListResponseDto,
  AdminUserMutationResponseDto,
  AdminUserResponseDto,
  CreateAdminUserDto,
  CreateAdminUserInputSchema,
  ResetAdminUserPasswordDto,
  ResetAdminUserPasswordInputSchema,
  UpdateAdminUserDto,
  UpdateAdminUserInputSchema,
  UsersApiFailureDto,
} from "./users.swagger";

const serializeAdminUser = (record: AdminUserRecord): AdminUser => ({
  userId: record.userId,
  name: record.name,
  email: record.email,
  username: record.username,
  role: record.role,
  status: record.status,
  // `department` is already normalised to `string[]` at the repository
  // boundary, so the controller is just shape-mapping at this point.
  department: record.department,
  emailVerified: record.emailVerified,
  lastLogin: record.lastLogin ? record.lastLogin.toISOString() : null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

@ApiTags("users")
@ApiExtraModels(
  AdminUserListResponseDto,
  AdminUserResponseDto,
  AdminUserMutationResponseDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  ResetAdminUserPasswordDto,
  UsersApiFailureDto,
)
@Roles("SUPER_ADMIN")
@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    operationId: "listUsers",
    summary: "List users",
  })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "pageSize", type: Number, required: false })
  @ApiQuery({ name: "search", type: String, required: false })
  @ApiQuery({
    name: "role",
    required: false,
    enum: ["SUPER_ADMIN", "ADMIN", "USER"],
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
  })
  @ZodResponse({
    description: "Paginated list of users",
    status: 200,
    type: AdminUserListResponseDto,
  })
  @ApiUnauthorizedResponse({ type: UsersApiFailureDto })
  async list(
    @Query(new ZodValidationPipe(AdminUserListQuerySchema))
    query: AdminUserListQueryDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const { items, totalItems } = await this.usersService.list({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      role: query.role,
      status: query.status,
    });

    return paginatedResponse(
      items.map(serializeAdminUser),
      {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
      },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: "createUser",
    summary: "Create a new user",
  })
  @ApiBody({ type: CreateAdminUserDto })
  @ZodResponse({
    description: "Returns the created user",
    status: 201,
    type: AdminUserResponseDto,
  })
  @ApiBadRequestResponse({ type: UsersApiFailureDto })
  @ApiConflictResponse({ type: UsersApiFailureDto })
  async create(
    @Body(new ZodValidationPipe(CreateAdminUserInputSchema))
    body: CreateAdminUserDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const created = await this.usersService.create({
      email: body.email,
      name: body.name,
      username: body.username,
      password: body.password,
      role: body.role,
      status: body.status,
      department: body.department,
    });
    return successResponse(serializeAdminUser(created), {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Get(":userId")
  @ApiOperation({
    operationId: "getUser",
    summary: "Get a user by id",
  })
  @ApiParam({ name: "userId", type: String })
  @ZodResponse({
    description: "Returns the requested user",
    status: 200,
    type: AdminUserResponseDto,
  })
  @ApiNotFoundResponse({ type: UsersApiFailureDto })
  async get(
    @Param("userId") userId: string,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const user = await this.usersService.getByUserId(userId);
    return successResponse(serializeAdminUser(user), {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Patch(":userId")
  @ApiOperation({
    operationId: "updateUser",
    summary: "Update an existing user",
  })
  @ApiParam({ name: "userId", type: String })
  @ApiBody({ type: UpdateAdminUserDto })
  @ZodResponse({
    description: "Returns the updated user",
    status: 200,
    type: AdminUserResponseDto,
  })
  @ApiBadRequestResponse({ type: UsersApiFailureDto })
  @ApiNotFoundResponse({ type: UsersApiFailureDto })
  async update(
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(UpdateAdminUserInputSchema))
    body: UpdateAdminUserDto,
    @CurrentUser() actor: SessionUserInternal,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const updated = await this.usersService.update(actor.userId, userId, body);
    return successResponse(serializeAdminUser(updated), {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Delete(":userId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "deleteUser",
    summary: "Delete a user",
  })
  @ApiParam({ name: "userId", type: String })
  @ZodResponse({
    description: "Returns whether the user was deleted",
    status: 200,
    type: AdminUserMutationResponseDto,
  })
  @ApiBadRequestResponse({ type: UsersApiFailureDto })
  @ApiNotFoundResponse({ type: UsersApiFailureDto })
  async delete(
    @Param("userId") userId: string,
    @CurrentUser() actor: SessionUserInternal,
    @Req() request: Request & RequestWithRequestId,
  ) {
    await this.usersService.delete(actor.userId, userId);
    return successResponse(
      { changed: true },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Post(":userId/password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "resetUserPassword",
    summary: "Reset a user's password",
  })
  @ApiParam({ name: "userId", type: String })
  @ApiBody({ type: ResetAdminUserPasswordDto })
  @ZodResponse({
    description: "Returns whether the password was reset",
    status: 200,
    type: AdminUserMutationResponseDto,
  })
  @ApiBadRequestResponse({ type: UsersApiFailureDto })
  @ApiNotFoundResponse({ type: UsersApiFailureDto })
  async resetPassword(
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(ResetAdminUserPasswordInputSchema))
    body: ResetAdminUserPasswordDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    await this.usersService.resetPassword(userId, body.password);
    return successResponse(
      { changed: true },
      { requestId: getOrCreateRequestId(request) },
    );
  }
}
