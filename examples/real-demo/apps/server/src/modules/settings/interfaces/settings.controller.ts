import type { Request } from "express";

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Req,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
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
import { SettingsService } from "../application/settings.service";
import {
  SettingsApiFailureDto,
  SystemSettingsResponseDto,
  UpdateSystemSettingsDto,
  UpdateSystemSettingsInputSchema,
} from "./settings.swagger";

@ApiTags("settings")
@ApiExtraModels(
  SystemSettingsResponseDto,
  UpdateSystemSettingsDto,
  SettingsApiFailureDto,
)
// SUPER_ADMIN bypasses any required role via the guard, but list both
// roles explicitly so the contract is obvious from the controller alone
// instead of depending on a guard implementation detail.
@Roles("ADMIN", "SUPER_ADMIN")
@Controller("settings")
export class SettingsController {
  constructor(
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  @Get("system")
  @ApiOperation({
    operationId: "getSystemSettings",
    summary: "Get the current system settings",
  })
  @ZodResponse({
    description: "Returns the current system settings",
    status: 200,
    type: SystemSettingsResponseDto,
  })
  @ApiUnauthorizedResponse({ type: SettingsApiFailureDto })
  async getSystem(@Req() request: Request & RequestWithRequestId) {
    const settings = await this.settingsService.getSystemSettings();
    return successResponse(settings, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Patch("system")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "updateSystemSettings",
    summary: "Update the system settings",
  })
  @ApiBody({ type: UpdateSystemSettingsDto })
  @ZodResponse({
    description: "Returns the updated system settings",
    status: 200,
    type: SystemSettingsResponseDto,
  })
  @ApiBadRequestResponse({ type: SettingsApiFailureDto })
  @ApiUnauthorizedResponse({ type: SettingsApiFailureDto })
  async updateSystem(
    @Body(new ZodValidationPipe(UpdateSystemSettingsInputSchema))
    body: UpdateSystemSettingsDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const settings = await this.settingsService.updateSystemSettings(body);
    return successResponse(settings, {
      requestId: getOrCreateRequestId(request),
    });
  }
}
