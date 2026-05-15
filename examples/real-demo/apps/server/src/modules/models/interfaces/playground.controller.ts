import type { Request, Response } from "express";

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
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
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { convertToModelMessages, type UIMessage } from "ai";
import { ZodResponse } from "nestjs-zod";

import {
  getOrCreateRequestId,
  type RequestWithRequestId,
} from "../../../common/http/request-id";
import { successResponse } from "../../../common/http/success-response";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { Roles } from "../../auth/interfaces/auth.guard";
import { ModelsService } from "../application/models.service";
import { redactSecrets } from "../application/secret-redaction";
import {
  ModelsApiFailureDto,
  PlaygroundRunDto,
  PlaygroundRunInputSchema,
  PlaygroundRunResponseDto,
  PlaygroundStreamDto,
  PlaygroundStreamInputSchema,
} from "./models.swagger";

@ApiTags("playground")
@ApiExtraModels(
  PlaygroundRunDto,
  PlaygroundRunResponseDto,
  PlaygroundStreamDto,
  ModelsApiFailureDto,
)
@Roles("ADMIN")
@Controller("playground")
export class PlaygroundController {
  private readonly logger = new Logger(PlaygroundController.name);

  constructor(
    @Inject(ModelsService) private readonly modelsService: ModelsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "runPlayground",
    summary: "Run a non-streaming inference call",
  })
  @ApiBody({ type: PlaygroundRunDto })
  @ZodResponse({
    description: "Returns the model response and metrics",
    status: 200,
    type: PlaygroundRunResponseDto,
  })
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  @ApiUnauthorizedResponse({ type: ModelsApiFailureDto })
  async run(
    @Body(new ZodValidationPipe(PlaygroundRunInputSchema))
    body: PlaygroundRunDto,
    @Req() request: Request & RequestWithRequestId,
  ) {
    const result = await this.modelsService.runChat({
      modelId: body.modelId,
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      topP: body.topP,
      frequencyPenalty: body.frequencyPenalty,
      presencePenalty: body.presencePenalty,
      stop: body.stop,
    });
    return successResponse(result, {
      requestId: getOrCreateRequestId(request),
    });
  }

  @Post("stream")
  @HttpCode(HttpStatus.OK)
  // SSE responses don't fit the OpenAPI request/response model the generated
  // SDK consumes (orval produces a JSON-typed client that can't iterate the
  // event stream and that mis-types success as a 400/401-only union). The
  // web app talks to this endpoint via AI SDK's `useChat` / `readUIMessageStream`
  // (see PlaygroundRuntime.tsx and shared/api/playground.ts); excluding it
  // from the OpenAPI spec keeps the generated REST client honest.
  @ApiExcludeEndpoint()
  @ApiOperation({
    operationId: "streamPlayground",
    summary: "Stream an inference call as an AI SDK UI message stream",
  })
  @ApiBody({ type: PlaygroundStreamDto })
  @ApiProduces("text/event-stream")
  @ApiBadRequestResponse({ type: ModelsApiFailureDto })
  @ApiUnauthorizedResponse({ type: ModelsApiFailureDto })
  async runStream(
    @Body(new ZodValidationPipe(PlaygroundStreamInputSchema))
    body: PlaygroundStreamDto,
    @Res() res: Response,
  ): Promise<void> {
    const modelMessages = await convertToModelMessages(
      body.messages as UIMessage[],
    );
    const result = await this.modelsService.runChatStream({
      modelId: body.modelId,
      system: body.system,
      messages: modelMessages,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      topP: body.topP,
      frequencyPenalty: body.frequencyPenalty,
      presencePenalty: body.presencePenalty,
      stop: body.stop,
    });
    const vendor = body.vendor;
    // Recorded on `start` so the wall-clock diff in `finish` represents the
    // server-observed upstream latency — close to what users intuitively
    // mean by "how long the model took." We avoid `useMessageTiming` on the
    // client because Vite's prebundle drops tree-shaken hooks intermittently.
    let startedAt = 0;
    // `pipeUIMessageStreamToResponse` writes into the response asynchronously
    // and is fire-and-forget. Bind an onError so upstream auth / network
    // failures surface as a terminal `error` event in the SSE body (instead
    // of the client seeing a clean `[DONE]` after no text). Also log it so
    // operators have something to grep when users report "Nothing came back".
    result.pipeUIMessageStreamToResponse(res, {
      onError: (error) => {
        // Upstream error messages can carry Authorization headers / API keys
        // verbatim (the AI SDK frequently includes the request body in its
        // error text). Run through the same redactor the non-streaming path
        // uses before either logging or echoing to the SSE body.
        const raw =
          error instanceof Error
            ? error.message || "Stream failed."
            : "Stream failed.";
        const message = redactSecrets(raw);
        this.logger.warn(
          { modelId: body.modelId, error: message },
          "Playground stream failed mid-flight.",
        );
        return message;
      },
      messageMetadata: ({ part }) => {
        // Stamp the vendor on the assistant message once at start so the UI
        // can render the right provider logo as soon as the bubble appears
        // (avoids a flicker when the avatar resolves only on finish).
        if (part.type === "start") {
          startedAt = Date.now();
          return vendor ? { vendor } : undefined;
        }
        if (part.type === "finish") {
          const usage = part.totalUsage;
          const latencyMs = startedAt ? Date.now() - startedAt : null;
          return {
            latencyMs,
            usage: usage
              ? {
                  promptTokens: usage.inputTokens ?? null,
                  completionTokens: usage.outputTokens ?? null,
                  totalTokens: usage.totalTokens ?? null,
                }
              : null,
          };
        }
        return undefined;
      },
    });
  }
}
