export const PUBLIC_UI_PATHS = ["/login"] as const;

export type PublicUiPath = (typeof PUBLIC_UI_PATHS)[number];

export interface PublicApiEndpoint {
  method: "GET" | "POST";
  path: string;
  reason: string;
}

export const PUBLIC_API_ENDPOINTS: readonly PublicApiEndpoint[] = [
  {
    method: "GET",
    path: "/health",
    reason: "Readiness probe",
  },
  {
    method: "GET",
    path: "/ready",
    reason: "Readiness probe alias",
  },
  {
    method: "GET",
    path: "/live",
    reason: "Liveness probe",
  },
  {
    method: "POST",
    path: "/api/v1/auth/sign-in",
    reason: "Credential sign-in entry point",
  },
  {
    method: "POST",
    path: "/api/v1/auth/captcha",
    reason: "Sign-in CAPTCHA challenge issuer",
  },
  {
    method: "POST",
    path: "/api/v1/auth/sign-out",
    reason: "Must work even when the session is already invalid",
  },
  {
    method: "GET",
    path: "/api/v1/auth/sign-in/ioa/status",
    reason: "iOA polling endpoint used before a session exists",
  },
  {
    method: "GET",
    path: "/api/v1/auth/dev-accounts",
    reason:
      "Local-only dev login helper; always returns an empty list unless AUTH_DEV_LOGIN_ENABLED is set in non-production",
  },
] as const;

export const isPublicUiPath = (pathname: string): boolean =>
  PUBLIC_UI_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );

const stripQueryAndFragment = (pathname: string): string => {
  const queryIndex = pathname.indexOf("?");
  const fragmentIndex = pathname.indexOf("#");
  const cuts = [queryIndex, fragmentIndex].filter((index) => index >= 0);
  if (cuts.length === 0) {
    return pathname;
  }
  return pathname.slice(0, Math.min(...cuts));
};

const normalizeApiPathname = (pathname: string): string => {
  const withoutQuery = stripQueryAndFragment(pathname);
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
};

export const matchPublicApiEndpoint = (
  method: string,
  pathname: string,
  basePath = "",
): PublicApiEndpoint | undefined => {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizeApiPathname(pathname);
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;

  return PUBLIC_API_ENDPOINTS.find((entry) => {
    if (entry.method !== normalizedMethod) {
      return false;
    }
    const candidate = `${normalizedBase}${entry.path}` || "/";
    return candidate === normalizedPath;
  });
};

export const isPublicApiEndpoint = (
  method: string,
  pathname: string,
  basePath = "",
): boolean => Boolean(matchPublicApiEndpoint(method, pathname, basePath));
