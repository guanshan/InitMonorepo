import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isPublicApiEndpoint } from "@real-demo/shared";
import type { Request } from "express";

import { loadEnvironment } from "../../../common/config/env";
import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_USER_ACCOUNT_INACTIVE,
  AUTH_USER_ACCOUNT_SUSPENDED,
  type UserRole,
} from "../domain/auth.types";
import { SessionService } from "../application/session.service";
import { SESSION_USER_KEY } from "./auth.decorator";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(SessionService)
    private readonly sessionService: SessionService,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const isPublicByDecorator = Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );

    // The shared matrix is for drift detection, not authorization: only
    // `@Public()` actually opens an endpoint. Treating the matrix as a
    // bypass would let a single shared/contracts edit silently reach
    // around the guard.
    const matrixBasePath = loadEnvironment().appBasePath;
    const isPublicByMatrix = isPublicApiEndpoint(
      request.method,
      request.path,
      matrixBasePath === "/" ? "" : matrixBasePath,
    );

    if (isPublicByDecorator !== isPublicByMatrix) {
      this.logger.warn(
        `Public-endpoint matrix drift detected for ${request.method} ${request.path}: ` +
          `decorator=${String(isPublicByDecorator)}, ` +
          `sharedMatrix=${String(isPublicByMatrix)}. ` +
          "Update packages/shared/src/contracts/auth-access-matrix.ts to keep them aligned.",
      );
    }

    if (isPublicByDecorator) {
      return true;
    }

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Not authenticated.");
    }

    const sessionUser = await this.sessionService.validate(token);

    if (!sessionUser) {
      throw new UnauthorizedException("Session expired or invalid.");
    }

    if (sessionUser.status === "SUSPENDED") {
      throw new ForbiddenException({
        code: AUTH_USER_ACCOUNT_SUSPENDED,
        message: "Account is suspended.",
      });
    }

    if (sessionUser.status !== "ACTIVE") {
      throw new ForbiddenException({
        code: AUTH_USER_ACCOUNT_INACTIVE,
        message: "Account is not active.",
      });
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles?.length) {
      const hasRole = requiredRoles.includes(sessionUser.role);
      const isSuperAdmin = sessionUser.role === "SUPER_ADMIN";

      if (!hasRole && !isSuperAdmin) {
        throw new ForbiddenException("Insufficient permissions.");
      }
    }

    (request as unknown as Record<string, unknown>)[SESSION_USER_KEY] =
      sessionUser;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    if (cookies?.[AUTH_SESSION_COOKIE_NAME]) {
      return cookies[AUTH_SESSION_COOKIE_NAME];
    }

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
