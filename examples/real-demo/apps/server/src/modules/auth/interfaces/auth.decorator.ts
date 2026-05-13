import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { SessionUserInternal } from "../domain/auth.types";

export const SESSION_USER_KEY = "sessionUser";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUserInternal => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as unknown as Record<string, unknown>)[
      SESSION_USER_KEY
    ] as SessionUserInternal;
  },
);
