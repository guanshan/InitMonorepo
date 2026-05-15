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
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
import { Roles } from "../../auth/interfaces/auth.guard";
import { ModelsService } from "../application/models.service";
import {
  CreateModelDefInputSchema,
  CreateModelDto,
  ModelListQueryDto,
  ModelListQuerySchema,
  ModelListResponseDto,
  ModelResponseDto,
  ModelsApiFailureDto,
  MutationResponseDto,
  UpdateModelDefInputSchema,
  UpdateModelDto,
  VerifyModelResponseDto,
} from "./models.swagger";

@ApiTags("models")
@ApiExtraModels(
  ModelListResponseDto,
  ModelResponseDto,
  MutationResponseDto,
  VerifyModelResponseDto,
  CreateModelDto,
  UpdateModelDto,
  ModelsApiFailureDto,
)
@Roles("ADMIN")
@Controller("models")
export class ModelsController {
  constructor(
    @Inject(ModelsService) private readonly modelsService: ModelsService,
  ) {}

  @Get()
  @ApiOperation({ operationId: "listModels", summary: "List models" })
  @ApiQuery({ name: "search", type: String, required: false })
  @ApiQuery({ name: "providerId", type: String, required: false })
  @ApiQuery({ name: "enabled", type: Boolean, required: false })
  @ZodResponse({
    description: "All configured models with resolved provider info",
    status: 200,
    type: ModelListResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ModelsApiFailureDto })
  async list(
    @Query(new ZodValidationPipe(ModelListQuerySchema))
    query: ModelListQueryDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const items = await this.modelsService.list(query);
    return successResponse(items, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: "createModel", summary: "Create a model" })
  @ApiBody({ type: CreateModelDto })
  @ZodResponse({
    description: "The created model view",
    status: 201,
    type: ModelResponseDto,
  })
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  async create(
    @Body(new ZodValidationPipe(CreateModelDefInputSchema))
    body: CreateModelDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const view = await this.modelsService.create(body);
    return successResponse(view, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Get(":modelId")
  @ApiOperation({ operationId: "getModel", summary: "Get a model" })
  @ApiParam({ name: "modelId", type: String })
  @ZodResponse({
    description: "Model view",
    status: 200,
    type: ModelResponseDto,
  })
  @ApiNotFoundResponse({ type: ModelsApiFailureDto })
  async get(
    @Param("modelId") modelId: string,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const view = await this.modelsService.get(modelId);
    return successResponse(view, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Patch(":modelId")
  @ApiOperation({ operationId: "updateModel", summary: "Update a model" })
  @ApiParam({ name: "modelId", type: String })
  @ApiBody({ type: UpdateModelDto })
  @ZodResponse({
    description: "Updated model view",
    status: 200,
    type: ModelResponseDto,
  })
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  @ApiNotFoundResponse({ type: ModelsApiFailureDto })
  async update(
    @Param("modelId") modelId: string,
    @Body(new ZodValidationPipe(UpdateModelDefInputSchema))
    body: UpdateModelDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const view = await this.modelsService.update(modelId, body);
    return successResponse(view, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Delete(":modelId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "deleteModel", summary: "Delete a model" })
  @ApiParam({ name: "modelId", type: String })
  @ZodResponse({
    description: "Whether the model was removed",
    status: 200,
    type: MutationResponseDto,
  })
  @ApiNotFoundResponse({ type: ModelsApiFailureDto })
  async delete(
    @Param("modelId") modelId: string,
    @Req() request: Request & RequestWithRequestId,
  ) {
    await this.modelsService.delete(modelId);
    return successResponse(
      { changed: true },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Post(":modelId/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "verifyModel",
    summary: "Test connectivity to a model with a lightweight upstream call",
  })
  @ApiParam({ name: "modelId", type: String })
  @ZodResponse({
    description: "Verification outcome",
    status: 200,
    type: VerifyModelResponseDto,
  })
  @ApiNotFoundResponse({ type: ModelsApiFailureDto })
  async verify(
    @Param("modelId") modelId: string,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const result = await this.modelsService.verify(modelId);
    return successResponse(result, {
      requestId: getOrCreateRequestId(request),
    });
  }
}
