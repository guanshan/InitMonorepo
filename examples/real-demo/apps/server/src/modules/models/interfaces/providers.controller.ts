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
  Req,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
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
import { ProvidersService } from "../application/providers.service";
import {
  CreateProviderDto,
  CreateProviderInputSchema,
  DiscoverModelsDto,
  DiscoverModelsInputSchema,
  DiscoverModelsResponseDto,
  ModelsApiFailureDto,
  MutationResponseDto,
  ProviderListResponseDto,
  ProviderResponseDto,
  UpdateProviderDto,
  UpdateProviderInputSchema,
} from "./models.swagger";

@ApiTags("providers")
@ApiExtraModels(
  ProviderListResponseDto,
  ProviderResponseDto,
  MutationResponseDto,
  DiscoverModelsDto,
  DiscoverModelsResponseDto,
  CreateProviderDto,
  UpdateProviderDto,
  ModelsApiFailureDto,
)
@Roles("ADMIN")
@Controller("providers")
export class ProvidersController {
  constructor(
    @Inject(ProvidersService) private readonly providersService: ProvidersService,
    @Inject(ModelsService) private readonly modelsService: ModelsService,
  ) {}

  @Get()
  @ApiOperation({ operationId: "listProviders", summary: "List providers" })
  @ZodResponse({
    description: "All configured providers (API keys masked)",
    status: 200,
    type: ProviderListResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ModelsApiFailureDto })
  async list(@Req() request: Request & RequestWithRequestId) {
    const items = await this.providersService.list();
    return successResponse(items, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: "createProvider", summary: "Create a provider" })
  @ApiBody({ type: CreateProviderDto })
  @ZodResponse({
    description: "Created provider view",
    status: 201,
    type: ProviderResponseDto,
  })
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  async create(
    @Body(new ZodValidationPipe(CreateProviderInputSchema))
    body: CreateProviderDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const view = await this.providersService.create(body);
    return successResponse(view, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Get(":providerId")
  @ApiOperation({ operationId: "getProvider", summary: "Get a provider" })
  @ApiParam({ name: "providerId", type: String })
  @ZodResponse({
    description: "Provider view",
    status: 200,
    type: ProviderResponseDto,
  })
  @ApiNotFoundResponse({ type: ModelsApiFailureDto })
  async get(
    @Param("providerId") providerId: string,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const view = await this.providersService.get(providerId);
    return successResponse(view, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Patch(":providerId")
  @ApiOperation({ operationId: "updateProvider", summary: "Update a provider" })
  @ApiParam({ name: "providerId", type: String })
  @ApiBody({ type: UpdateProviderDto })
  @ZodResponse({
    description: "Updated provider view",
    status: 200,
    type: ProviderResponseDto,
  })
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  @ApiNotFoundResponse({ type: ModelsApiFailureDto })
  async update(
    @Param("providerId") providerId: string,
    @Body(new ZodValidationPipe(UpdateProviderInputSchema))
    body: UpdateProviderDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const view = await this.providersService.update(providerId, body);
    return successResponse(view, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Delete(":providerId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "deleteProvider", summary: "Delete a provider" })
  @ApiParam({ name: "providerId", type: String })
  @ZodResponse({
    description: "Whether the provider was removed",
    status: 200,
    type: MutationResponseDto,
  })
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  @ApiNotFoundResponse({ type: ModelsApiFailureDto })
  async delete(
    @Param("providerId") providerId: string,
    @Req() request: Request & RequestWithRequestId,
  ) {
    await this.providersService.delete(providerId);
    return successResponse(
      { changed: true },
      { requestId: getOrCreateRequestId(request) },
    );
  }

  @Post("discover")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "discoverProviderModels",
    summary:
      "List models exposed by a provider, using stored creds or an ad-hoc credential triple",
  })
  @ApiBody({ type: DiscoverModelsDto })
  @ZodResponse({
    description: "Upstream model list",
    status: 200,
    type: DiscoverModelsResponseDto,
  })
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  async discover(
    @Body(new ZodValidationPipe(DiscoverModelsInputSchema))
    body: DiscoverModelsDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const result = await this.modelsService.discoverModels(body);
    return successResponse(result, {
      requestId: getOrCreateRequestId(request),
    });
  }
}
