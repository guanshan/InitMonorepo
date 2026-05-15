import { getConfigSnapshot as sdkGetConfigSnapshot } from "@real-demo/sdk";
import type { ConfigSnapshot } from "@real-demo/shared";

type SdkEnvelope<T> = {
  success: true;
  data: T;
};

export async function getConfigSnapshot(options?: {
  signal?: AbortSignal;
}): Promise<ConfigSnapshot> {
  const response = await sdkGetConfigSnapshot(
    options?.signal ? { signal: options.signal } : undefined,
  );
  const body = response.data as unknown as SdkEnvelope<ConfigSnapshot>;
  return body.data;
}
