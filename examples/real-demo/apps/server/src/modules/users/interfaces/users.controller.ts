import {
  CreateUserInputSchema,
  type CreateUserInput as CreateUserRequest,
} from "@real-demo/shared";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "../../../common/http/request-id";
import { successResponse } from "../../../common/http/success-response";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CreateUserUseCase } from "../application/use-cases/create-user.use-case";
import { GetUserByIdUseCase } from "../application/use-cases/get-user-by-id.use-case";
import { ListUsersUseCase } from "../application/use-cases/list-users.use-case";
import {
  ApiFailureDto,
  CreateUserDto,
  CreateUserResponseDto,
  UserDetailResponseDto,
  UserDto,
  UserListResponseDto,
} from "./users.swagger";
import {
  presentUser,
  presentUsers,
  toCreateUserDraft,
} from "./users.presenter";

@ApiTags("users")
@ApiExtraModels(
  UserDto,
  CreateUserDto,
  UserListResponseDto,
  UserDetailResponseDto,
  CreateUserResponseDto,
  ApiFailureDto,
)
@Controller("users")
export class UsersController {
  constructor(
    @Inject(ListUsersUseCase)
    private readonly listUsersUseCase: ListUsersUseCase,
    @Inject(GetUserByIdUseCase)
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    @Inject(CreateUserUseCase)
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List users",
  })
  @ZodResponse({
    description: "Returns the list of users",
    status: 200,
    type: UserListResponseDto,
  })
  async listUsers(@Req() request: RequestWithRequestId) {
    const result = await this.listUsersUseCase.execute();

    return successResponse(presentUsers(result.users), {
      cached: result.cached,
      requestId: getOrCreateRequestId(request),
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a user by id",
  })
  @ApiParam({
    name: "id",
    type: String,
  })
  @ZodResponse({
    description: "Returns the user",
    status: 200,
    type: UserDetailResponseDto,
  })
  @ApiNotFoundResponse({
    description: "User not found",
    type: ApiFailureDto,
  })
  async getUserById(
    @Param("id") id: string,
    @Req() request: RequestWithRequestId,
  ) {
    const result = await this.getUserByIdUseCase.execute(id);

    return successResponse(presentUser(result.user), {
      cached: result.cached,
      requestId: getOrCreateRequestId(request),
    });
  }

  @Post()
  @ApiOperation({
    summary: "Create a user",
  })
  @ApiBody({
    type: CreateUserDto,
  })
  @ZodResponse({
    description: "Returns the created user",
    status: 201,
    type: CreateUserResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Validation error",
    type: ApiFailureDto,
  })
  @ApiConflictResponse({
    description: "Email already exists",
    type: ApiFailureDto,
  })
  async createUser(
    @Body(new ZodValidationPipe(CreateUserInputSchema))
    body: CreateUserRequest,
    @Req() request: RequestWithRequestId,
  ) {
    const user = await this.createUserUseCase.execute(toCreateUserDraft(body));

    return successResponse(presentUser(user), {
      requestId: getOrCreateRequestId(request),
    });
  }
}
