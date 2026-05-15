import {
  getSystemSettings as sdkGetSystemSettings,
  updateSystemSettings as sdkUpdateSystemSettings,
} from "@real-demo/sdk";
import type {
  SystemSettings,
  UpdateSystemSettingsInput,
} from "@real-demo/shared";

type SdkEnvelope<T> = { success: true; data: T };

export async function fetchSystemSettings(options?: {
  signal?: AbortSignal;
}): Promise<SystemSettings> {
  const response = await sdkGetSystemSettings(
    options?.signal ? { signal: options.signal } : undefined,
  );
  const body = response.data as unknown as SdkEnvelope<SystemSettings>;
  return body.data;
}

export async function updateSystemSettings(
  input: UpdateSystemSettingsInput,
): Promise<SystemSettings> {
  const response = await sdkUpdateSystemSettings(input);
  const body = response.data as unknown as SdkEnvelope<SystemSettings>;
  return body.data;
}
