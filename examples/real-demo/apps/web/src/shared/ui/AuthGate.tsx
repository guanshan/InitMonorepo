import type { PropsWithChildren } from "react";

import { isPublicUiPath } from "@real-demo/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

import { useAuthStore } from "../store/auth-store";
import { LoadingState } from "./LoadingState";

/**
 * Sits between the route outlet and individual pages, and enforces the
 * "signed in vs not" branching:
 *
 *   - while the session probe is in flight → render the shared loading state
 *   - on a public path (e.g. /login) → render children
 *   - signed-in on a public path → bounce back to "/"
 *   - not signed-in on a protected path → bounce to /login?redirect=…
 */
export const AuthGate = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  const pathname = location.pathname;
  const isPublic = isPublicUiPath(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublic) {
      const redirectTarget = `${pathname}${location.search}`;
      const target =
        redirectTarget === "/" || redirectTarget === ""
          ? "/login"
          : `/login?redirect=${encodeURIComponent(redirectTarget)}`;
      navigate(target, { replace: true });
      return;
    }

    if (isAuthenticated && isPublic) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, isPublic, location.search, navigate, pathname]);

  if (isLoading) {
    return (
      <LoadingState
        description={t("auth.loading.description")}
        title={t("auth.loading.title")}
      />
    );
  }

  // While the redirect side-effect runs we briefly render nothing rather
  // than the protected page; otherwise a flash of unauth content leaks.
  if (!isAuthenticated && !isPublic) {
    return null;
  }

  if (isAuthenticated && isPublic) {
    return null;
  }

  return <>{children}</>;
};
