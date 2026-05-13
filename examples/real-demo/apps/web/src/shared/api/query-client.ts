import { ApiRequestError } from "@real-demo/sdk/types";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  type Mutation,
  type Query,
} from "@tanstack/react-query";

import { i18n } from "../lib/i18n";
import { getUserFacingErrorMessage } from "../lib/user-facing-error";
import { clearCurrentUserCache } from "../store/auth-store";
import { enqueueRequestFeedback } from "../store/request-feedback-store";

/**
 * Opt-in marker for query/mutation callers that want to suppress the global
 * toast on failure. Set `{ meta: { silentError: true } }` on the query/
 * mutation options. Useful for expected failures (auth bootstrap, optional
 * background refresh) or for callers that surface their own error UI and
 * don't want the generic "Request failed" banner on top.
 *
 * 401 still clears the cached user so AuthGate can redirect — session
 * expiry changes what the user can do and is never truly "silent".
 */
export interface SilentErrorMeta {
  silentError?: boolean;
}

const isSilent = (meta: Record<string, unknown> | undefined): boolean =>
  Boolean((meta as SilentErrorMeta | undefined)?.silentError);

let queryClientRef: QueryClient | null = null;

const reportRequestError = (
  error: unknown,
  source?: Query<unknown, unknown> | Mutation<unknown, unknown>,
) => {
  const silent = isSilent(source?.meta);

  if (error instanceof ApiRequestError && error.status === 401) {
    if (queryClientRef) {
      clearCurrentUserCache(queryClientRef);
    }
    if (silent) {
      return;
    }
    enqueueRequestFeedback({
      description: i18n.t("requestFeedback.sessionExpired.description"),
      title: i18n.t("requestFeedback.sessionExpired.title"),
      variant: "info",
    });
    return;
  }

  if (silent) {
    console.warn("silent request error", error);
    return;
  }

  if (error instanceof ApiRequestError && error.status === undefined) {
    enqueueRequestFeedback({
      description: i18n.t("requestFeedback.network.description"),
      title: i18n.t("requestFeedback.network.title"),
      variant: "error",
    });
    return;
  }

  if (error instanceof Error) {
    enqueueRequestFeedback({
      description: getUserFacingErrorMessage(error),
      title: i18n.t("requestFeedback.generic.title"),
      variant: "error",
    });
    return;
  }

  enqueueRequestFeedback({
    description: getUserFacingErrorMessage(error),
    title: i18n.t("requestFeedback.generic.title"),
    variant: "error",
  });
  console.error(error);
};

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      reportRequestError(error, mutation),
  }),
  queryCache: new QueryCache({
    onError: (error, query) => reportRequestError(error, query),
  }),
  defaultOptions: {
    mutations: {
      retry: false,
    },
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

queryClientRef = queryClient;
