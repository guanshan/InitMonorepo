import { loadEnvironment } from "../config/env";

const getNormalizedPathname = (pathname: string) =>
  pathname.split("?")[0] || "/";

export const getLogAction = (method: string | undefined, pathname: string) =>
  `${method ?? "UNKNOWN"} ${getNormalizedPathname(pathname)}`;

export const getLogModule = (pathname: string) => {
  const environment = loadEnvironment();
  const normalizedPathname = getNormalizedPathname(pathname);
  const normalizedPath =
    environment.appBasePath !== "/" &&
    normalizedPathname.startsWith(environment.appBasePath)
      ? normalizedPathname.slice(environment.appBasePath.length) || "/"
      : normalizedPathname;
  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "root";
  }

  if (segments[0] === "api") {
    return segments[1] ?? "api";
  }

  if (
    segments[0] === "health" ||
    segments[0] === "ready" ||
    segments[0] === "live"
  ) {
    return "health";
  }

  return segments[0] ?? "root";
};
