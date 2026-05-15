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
import { fromNodeHeaders } from "better-auth/node";
import { isPublicApiEndpoint } from "@real-demo/shared";
import type { Request } from "express";

import { loadEnvironment } from "../../../common/config/env";
import {
  AUTH_USER_ACCOUNT_INACTIVE,
  AUTH_USER_ACCOUNT_SUSPENDED,
  type UserRole,
  type UserStatus,
} from "../domain/auth.types";
import { RoleService } from "../application/role.service";
import { BETTER_AUTH_TOKEN } from "../auth.tokens";
import { SESSION_USER_KEY } from "./auth.decorator";
import type { BetterAuthInstance } from "../auth.config";
import type { SessionUserInternal } from "../domain/auth.types";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

const parseDepartment = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw as string[];
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(BETTER_AUTH_TOKEN)
    private readonly auth: BetterAuthInstance,
    @Inject(RoleService)
    private readonly roleService: RoleService,
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

    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException("Not authenticated.");
    }

    const { user } = session;
    const status = user.status as UserStatus;

    if (status === "SUSPENDED") {
      throw new ForbiddenException({
        code: AUTH_USER_ACCOUNT_SUSPENDED,
        message: "Account is suspended.",
      });
    }

    if (status !== "ACTIVE") {
      throw new ForbiddenException({
        code: AUTH_USER_ACCOUNT_INACTIVE,
        message: "Account is not active.",
      });
    }

    const department = parseDepartment(user.department);
    const resolvedRole = await this.roleService.resolveUserRole({
      baseRole: user.role as UserRole,
      department,
    });

    const sessionUser: SessionUserInternal = {
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? "",
      username: (user.username as string | null) ?? user.name,
      role: resolvedRole.role,
      baseRole: resolvedRole.baseRole,
      roleSource: resolvedRole.roleSource,
      department,
      status,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };

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
}
