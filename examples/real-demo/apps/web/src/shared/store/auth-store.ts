import { useCallback } from "react";

import type { SessionUser } from "@real-demo/shared";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryFunctionContext,
} from "@tanstack/react-query";

import { fetchCurrentUser } from "../api/auth";

const CURRENT_USER_QUERY_KEY = ["auth", "current-user"] as const;

// Match legalbuddy: bound the session probe so a hung server doesn't trap
// protected routes in a permanent loading spinner.
const AUTH_BOOTSTRAP_TIMEOUT_MS = 15_000;

const fetchCurrentUserQuery = async ({
  signal,
}: QueryFunctionContext<typeof CURRENT_USER_QUERY_KEY>) => {
  const controller = new AbortController();
  const abortFromQuery = () => {
    controller.abort(signal.reason);
  };

  signal.addEventListener("abort", abortFromQuery, { once: true });

  const timeoutHandle = setTimeout(() => {
    controller.abort(
      new DOMException("auth-bootstrap timeout", "TimeoutError"),
    );
  }, AUTH_BOOTSTRAP_TIMEOUT_MS);

  try {
    return await fetchCurrentUser({ signal: controller.signal });
  } finally {
    clearTimeout(timeoutHandle);
    signal.removeEventListener("abort", abortFromQuery);
  }
};

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  setUser: (user: SessionUser | null) => void;
  logout: () => void;
}

export const setCurrentUserCache = (
  queryClient: QueryClient,
  user: SessionUser | null,
) => {
  queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
};

export const clearCurrentUserCache = (queryClient: QueryClient) => {
  void queryClient.cancelQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  setCurrentUserCache(queryClient, null);
};

export const useCurrentUserQuery = () =>
  useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUserQuery,
    meta: { silentError: true },
    retry: false,
  });

/**
 * Prefer the selector form. Reading the whole state object recomputes a
 * fresh shape on every render, which breaks `useEffect` deps, `useMemo`
 * equality checks, and prop identity for downstream components.
 */
export function useAuthStore(): AuthState;
export function useAuthStore<T>(selector: (state: AuthState) => T): T;
export function useAuthStore<T>(selector?: (state: AuthState) => T) {
  const query = useCurrentUserQuery();
  const queryClient = useQueryClient();

  const setUser = useCallback(
    (user: SessionUser | null) => {
      setCurrentUserCache(queryClient, user);
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearCurrentUserCache(queryClient);
  }, [queryClient]);

  const state: AuthState = {
    user: query.data ?? null,
    isAuthenticated: Boolean(query.data),
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    setUser,
    logout,
  };

  return selector ? selector(state) : state;
}
