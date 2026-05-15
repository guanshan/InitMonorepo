import type { PropsWithChildren } from "react";
import { Navigate } from "react-router";

import type { UserRole } from "@real-demo/shared";

import { useAuthStore } from "../store/auth-store";

interface RequireRoleProps {
  /**
   * Roles that are allowed to render the children. `SUPER_ADMIN` is implicitly
   * allowed everywhere — it should never be locked out of any admin route.
   */
  roles: readonly UserRole[];
  /** Optional override of the redirect target when the role check fails. */
  fallback?: string;
}

/**
 * Route-level role gate. Wrap the page component in a route file so the gate
 * runs before the page's bundle-level effects (data fetches, listeners,
 * subscriptions) can fire. Without this wrapper, a signed-in USER hitting
 * `/users` would briefly mount `UsersPage`, kick off `listAdminUsers`, and
 * then redirect — flashing a 401 from the API in the dev console and burning
 * a needless request on the server.
 *
 * `AuthGate` handles the "not signed in" case; this handles "signed in but
 * not authorised."
 */
export const RequireRole = ({
  roles,
  fallback = "/",
  children,
}: PropsWithChildren<RequireRoleProps>) => {
  const role = useAuthStore((state) => state.user?.role);
  const allowed =
    role === "SUPER_ADMIN" || (role !== undefined && roles.includes(role));
  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};
