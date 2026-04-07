import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import pino from "pino";

import { loadEnvironment } from "../config/env";
import { getLogAction, getLogModule } from "./log-context";
import { getOrCreateRequestId } from "./request-id";

interface HttpRequestLike {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  requestId?: string;
  url?: string;
}

interface HttpResponseLike {
  json: (body: unknown) => void;
  status: (statusCode: number) => HttpResponseLike;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getDefaultCode = (statusCode: number) => {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return "bad_request";
    case HttpStatus.NOT_FOUND:
      return "route_not_found";
    case HttpStatus.CONFLICT:
      return "conflict";
    default:
      return "internal_server_error";
  }
};

const getDefaultMessage = (statusCode: number) => {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return "The request could not be processed.";
    case HttpStatus.NOT_FOUND:
      return "The requested resource could not be found.";
    case HttpStatus.CONFLICT:
      return "The request could not be completed because of a conflict.";
    default:
      return "An unexpected error occurred.";
  }
};

const normalizeMessage = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
  ) {
    return value.join(", ");
  }

  return fallback;
};

const extractErrorDetails = (payload: unknown, statusCode: number) => {
  const defaultCode = getDefaultCode(statusCode);
  const defaultMessage = getDefaultMessage(statusCode);

  if (!isRecord(payload)) {
    return {
      code: defaultCode,
      issues: undefined,
      message: defaultMessage,
    };
  }

  const issuePayload = "issues" in payload ? payload.issues : undefined;
  const nestedError = isRecord(payload.error) ? payload.error : null;

  if (nestedError) {
    return {
      code:
        typeof nestedError.code === "string" && nestedError.code.length > 0
          ? nestedError.code
          : defaultCode,
      issues: issuePayload,
      message: normalizeMessage(nestedError.message, defaultMessage),
    };
  }

  return {
    code: defaultCode,
    issues: issuePayload,
    message: normalizeMessage(payload.message, defaultMessage),
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = pino({
    level: loadEnvironment().logLevel,
    messageKey: "message",
    formatters: {
      level: (label) => ({
        level: label,
      }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  });

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<HttpRequestLike>();
    const response = context.getResponse<HttpResponseLike>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const errorDetails = extractErrorDetails(payload, statusCode);
    const pathname = request.originalUrl ?? request.url ?? "unknown";
    const requestId = getOrCreateRequestId(request);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          action: getLogAction(request.method, pathname),
          error:
            exception instanceof Error ? exception.message : String(exception),
          module: getLogModule(pathname),
          requestId,
          service: "real-demo-server",
          ...(exception instanceof Error && exception.stack
            ? { stack: exception.stack }
            : {}),
        },
        "request failed",
      );
    }

    response.status(statusCode).json({
      success: false as const,
      error: {
        code: errorDetails.code,
        message: errorDetails.message,
      },
      ...(errorDetails.issues !== undefined
        ? { issues: errorDetails.issues }
        : {}),
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
