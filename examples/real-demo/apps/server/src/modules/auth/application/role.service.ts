import { Injectable } from "@nestjs/common";

import type { UserRole, UserRoleSource } from "../domain/auth.types";

interface ResolveInput {
  baseRole: UserRole;
  department: unknown;
}

export interface RoleResolution {
  role: UserRole;
  baseRole: UserRole;
  roleSource: UserRoleSource;
}

/**
 * Demo-friendly role resolution: every user keeps their base role.
 *
 * Legalbuddy layers direct- and department-scoped overrides on top of this;
 * we trim that down so the example monorepo stays focused on the credentials
 * flow. Reintroduce assignment tables here when a real product needs them.
 */
@Injectable()
export class RoleService {
  async resolveUserRole(input: ResolveInput): Promise<RoleResolution> {
    return {
      role: input.baseRole,
      baseRole: input.baseRole,
      roleSource: "base",
    };
  }
}
