const ROOT_PATH = "/";

export const normalizeBasePath = (input: string | null | undefined) => {
  const trimmed = (input ?? "").trim();

  if (trimmed.length === 0 || trimmed === ROOT_PATH) {
    return ROOT_PATH;
  }

  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/g, ROOT_PATH).replace(/\/+$/g, "");

  return normalized.length === 0 ? ROOT_PATH : normalized;
};

export const joinUrlPath = (basePath: string, segment: string) => {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedSegment = segment.replace(/^\/+/, "");

  if (normalizedBasePath === ROOT_PATH) {
    return `${ROOT_PATH}${normalizedSegment}`;
  }

  return `${normalizedBasePath}/${normalizedSegment}`;
};
