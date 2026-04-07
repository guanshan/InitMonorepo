interface FetcherRequestInit extends RequestInit {
  baseUrl?: string;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
  issues?: unknown;
}

interface ApiRequestErrorOptions {
  cause?: unknown;
  code?: string;
  details?: unknown;
  status?: number;
}

export class ApiRequestError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly status?: number;

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.code = options.code;
    this.details = options.details;
    this.status = options.status;

    if ("cause" in Error.prototype) {
      this.cause = options.cause;
    }
  }
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeBaseUrl = (value: string) => {
  const trimmed = value.trim();

  if (trimmed === "/") {
    return "";
  }

  return trimmed.replace(/\/+$/g, "");
};

const normalizeRequestPath = (value: string) =>
  value.startsWith("/") ? value : `/${value}`;

const resolveRequestUrl = (url: string, baseUrl: string | undefined) => {
  if (isAbsoluteUrl(url)) {
    return url;
  }

  const normalizedRequestPath = normalizeRequestPath(url);

  if (!baseUrl || baseUrl.trim().length === 0) {
    return normalizedRequestPath;
  }

  return `${normalizeBaseUrl(baseUrl)}${normalizedRequestPath}`;
};

const isAbortSignalLike = (
  value: RequestInit["signal"],
): value is NonNullable<RequestInit["signal"]> =>
  typeof value === "object" &&
  value !== null &&
  "aborted" in value &&
  typeof value.addEventListener === "function" &&
  typeof value.removeEventListener === "function";

const canUseSignal = (signal: RequestInit["signal"]) => {
  if (!signal || typeof Request === "undefined") {
    return false;
  }

  try {
    void new Request("http://localhost", { signal });
    return true;
  } catch {
    return false;
  }
};

const getFetchSignal = (signal: RequestInit["signal"]) => {
  if (!signal) {
    return {
      cleanup: undefined,
      signal: undefined,
    };
  }

  if (canUseSignal(signal)) {
    return {
      cleanup: undefined,
      signal,
    };
  }

  if (!isAbortSignalLike(signal) || typeof AbortController === "undefined") {
    return {
      cleanup: undefined,
      signal: undefined,
    };
  }

  const controller = new AbortController();
  const abort = () => {
    controller.abort();
  };

  if (signal.aborted) {
    abort();
  } else {
    signal.addEventListener("abort", abort, { once: true });
  }

  return {
    cleanup: () => signal.removeEventListener("abort", abort),
    signal: canUseSignal(controller.signal) ? controller.signal : undefined,
  };
};

export const customFetcher = async <TResponse>(
  url: string,
  init?: FetcherRequestInit,
): Promise<TResponse> => {
  const resolvedUrl = resolveRequestUrl(url, init?.baseUrl);
  const { signal, ...restInit } = init ?? {};
  const fetchSignal = getFetchSignal(signal);
  delete (restInit as FetcherRequestInit).baseUrl;

  try {
    let response: Response;

    try {
      response = await fetch(resolvedUrl, {
        ...restInit,
        ...(fetchSignal.signal ? { signal: fetchSignal.signal } : {}),
      });
    } catch (error) {
      throw new ApiRequestError("Network request failed.", {
        cause: error,
      });
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

      throw new ApiRequestError(
        payload?.error?.message ?? `Request failed with ${response.status}`,
        {
          code: payload?.error?.code,
          details: payload?.issues,
          status: response.status,
        },
      );
    }

    return {
      data: (await response.json()) as unknown,
      headers: response.headers,
      status: response.status,
    } as TResponse;
  } finally {
    fetchSignal.cleanup?.();
  }
};
