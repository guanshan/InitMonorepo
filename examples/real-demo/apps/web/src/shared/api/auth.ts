import {
  ApiRequestError,
  changePassword as sdkChangePassword,
  getCurrentUser as sdkGetCurrentUser,
  issueSignInCaptcha as sdkIssueSignInCaptcha,
  signIn as sdkSignIn,
  signOut as sdkSignOut,
} from "@real-demo/sdk";
import type {
  CaptchaChallenge,
  DevAccount,
  SessionUser,
} from "@real-demo/shared";

import { apiFetch } from "./sdk-client";

interface SignInInput {
  email: string;
  password: string;
  captchaId: string;
  captchaAnswer: string;
}

type SdkEnvelope<T> = { success: true; data: T };

export async function signIn(input: SignInInput): Promise<void> {
  await sdkSignIn(input);
}

export async function fetchSignInCaptcha(options?: {
  signal?: AbortSignal;
}): Promise<CaptchaChallenge> {
  const response = await sdkIssueSignInCaptcha(
    options?.signal ? { signal: options.signal } : undefined,
  );
  const body = response.data as unknown as SdkEnvelope<CaptchaChallenge>;
  return body.data;
}

export async function signOut(): Promise<void> {
  try {
    await sdkSignOut();
  } catch {
    // sign-out is best-effort — the cookie is cleared server-side when the
    // session is still valid, and the client state is reset regardless.
  }
}

export async function fetchCurrentUser(options?: {
  signal?: AbortSignal;
}): Promise<SessionUser | null> {
  try {
    const response = await sdkGetCurrentUser(
      options?.signal ? { signal: options.signal } : undefined,
    );
    const body = response.data as unknown as SdkEnvelope<SessionUser>;
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
  await sdkChangePassword({ currentPassword, newPassword });
}

export async function fetchDevAccounts(options?: {
  signal?: AbortSignal;
}): Promise<DevAccount[]> {
  // /api/v1/auth/dev-accounts is marked @ApiExcludeEndpoint, so it does not
  // appear in the OpenAPI document and no SDK function is generated for it.
  // Keep this on the raw apiFetch path until we decide to expose the route.
  try {
    const body = await apiFetch<SdkEnvelope<{ accounts: DevAccount[] }>>(
      "/api/v1/auth/dev-accounts",
      options?.signal ? { signal: options.signal } : undefined,
    );
    return body.data.accounts;
  } catch {
    return [];
  }
}
