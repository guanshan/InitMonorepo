import { ApiRequestError } from "@real-demo/sdk/types";
import type {
  CaptchaChallenge,
  DevAccount,
  SessionUser,
} from "@real-demo/shared";

import { apiFetch } from "./sdk-client";

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface SignInInput {
  email: string;
  password: string;
  captchaId: string;
  captchaAnswer: string;
}

export async function signIn(input: SignInInput): Promise<void> {
  await apiFetch("/api/v1/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function fetchSignInCaptcha(options?: {
  signal?: AbortSignal;
}): Promise<CaptchaChallenge> {
  const body = await apiFetch<ApiSuccessResponse<CaptchaChallenge>>(
    "/api/v1/auth/captcha",
    {
      method: "POST",
      ...(options?.signal ? { signal: options.signal } : {}),
    },
  );
  return body.data;
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch("/api/v1/auth/sign-out", { method: "POST" });
  } catch {
    // sign-out is best-effort — the cookie is cleared server-side when the
    // session is still valid, and the client state is reset regardless.
  }
}

export async function fetchCurrentUser(options?: {
  signal?: AbortSignal;
}): Promise<SessionUser | null> {
  try {
    const body = await apiFetch<ApiSuccessResponse<SessionUser>>(
      "/api/v1/auth/me",
      options?.signal ? { signal: options.signal } : undefined,
    );
    return body.data;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (error.status === 401 || error.status === 403)
    ) {
      return null;
    }
    throw error;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch("/api/v1/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchDevAccounts(options?: {
  signal?: AbortSignal;
}): Promise<DevAccount[]> {
  try {
    const body = await apiFetch<ApiSuccessResponse<{ accounts: DevAccount[] }>>(
      "/api/v1/auth/dev-accounts",
      options?.signal ? { signal: options.signal } : undefined,
    );
    return body.data.accounts;
  } catch {
    return [];
  }
}
