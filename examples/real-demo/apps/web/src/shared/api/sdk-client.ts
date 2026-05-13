import { ApiRequestError } from "@real-demo/sdk/types";

import { environment } from "../config/env";

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
  issues?: unknown;
}

interface ApiFetchInit extends RequestInit {
  /**
   * When true (the default), 4xx/5xx responses raise `ApiRequestError` so
   * callers can pattern-match against `error.status`. Set false for endpoints
   * where the caller wants to inspect the raw response.
   */
  throwOnError?: boolean;
}

const trimmedBaseUrl = (environment.apiBaseUrl ?? "").replace(/\/+$/g, "");

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const resolveApiUrl = (path: string): string => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBaseUrl}${normalizedPath}`;
};

/**
 * Cookie-bearing fetch wrapper used by the auth API. The session cookie is
 * httpOnly and same-site lax, so we explicitly send credentials on every
 * call rather than relying on the browser's default heuristics.
 */
export const apiFetch = async <TResponse = unknown>(
  path: string,
  init: ApiFetchInit = {},
): Promise<TResponse> => {
  const { throwOnError = true, headers, ...rest } = init;
  const url = resolveApiUrl(path);

  let response: Response;

  try {
    response = await fetch(url, {
      ...rest,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });
  } catch (error) {
    throw new ApiRequestError("Network request failed.", { cause: error });
  }

  if (!throwOnError) {
    return (await response.json()) as TResponse;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | ApiErrorPayload
      | null;

    throw new ApiRequestError(
      payload?.error?.message ?? `Request failed with ${response.status}`,
      {
        code: payload?.error?.code,
        details: payload?.issues,
        status: response.status,
      },
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
};
