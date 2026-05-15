import type { Request } from "express";

import { Controller, Get, Inject, Req } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { ConfigSnapshot } from "@real-demo/shared";
import { ZodResponse } from "nestjs-zod";

import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "../../../common/http/request-id";
import { successResponse } from "../../../common/http/success-response";
import { Roles } from "../../auth/interfaces/auth.guard";
import { ModelsService } from "../application/models.service";
import { ProvidersService } from "../application/providers.service";
import {
  ConfigSnapshotResponseDto,
  ModelsApiFailureDto,
} from "./models.swagger";

@ApiTags("config")
@ApiExtraModels(ConfigSnapshotResponseDto, ModelsApiFailureDto)
// Class-level role guard so any handler added later inherits the gate.
// Adding `@Roles("ADMIN")` per-handler is a footgun: forget once and the
// new endpoint defaults to "any authenticated user."
@Roles("ADMIN")
@Controller("config")
export class ConfigController {
  constructor(
    @Inject(ProvidersService) private readonly providersService: ProvidersService,
    @Inject(ModelsService) private readonly modelsService: ModelsService,
  ) {}

  @Get("snapshot")
  @ApiOperation({
    operationId: "getConfigSnapshot",
    summary:
      "Read providers / templates / models in one call. API keys are returned masked.",
  })
  @ZodResponse({
    description: "Resolved snapshot of all three resources",
    status: 200,
    type: ConfigSnapshotResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ModelsApiFailureDto })
  async snapshot(@Req() request: Request & RequestWithRequestId) {
    const [providers, models] = await Promise.all([
      this.providersService.list(),
      this.modelsService.list({}),
    ]);
    const snapshot: ConfigSnapshot = { providers, models };
    return successResponse(snapshot, {
      requestId: getOrCreateRequestId(request),
    });
  }
}
