import {
  createProvider as sdkCreateProvider,
  deleteProvider as sdkDeleteProvider,
  discoverProviderModels as sdkDiscoverProviderModels,
  getProvider as sdkGetProvider,
  listProviders as sdkListProviders,
  updateProvider as sdkUpdateProvider,
} from "@real-demo/sdk";
import type {
  CreateProviderInput,
  DiscoverModelsInput,
  DiscoverModelsResult,
  ProviderView,
  UpdateProviderInput,
} from "@real-demo/shared";

type SdkEnvelope<T> = {
  success: true;
  data: T;
};

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as SdkEnvelope<T>;
  return body.data;
};

export async function listProviders(options?: {
  signal?: AbortSignal;
}): Promise<ProviderView[]> {
  const response = await sdkListProviders(
    options?.signal ? { signal: options.signal } : undefined,
  );
  return unwrap<ProviderView[]>(response);
}

export async function getProvider(id: string): Promise<ProviderView> {
  const response = await sdkGetProvider(id);
  return unwrap<ProviderView>(response);
}

export async function createProvider(
  input: CreateProviderInput,
): Promise<ProviderView> {
  const response = await sdkCreateProvider(input);
  return unwrap<ProviderView>(response);
}

export async function updateProvider(
  id: string,
  input: UpdateProviderInput,
): Promise<ProviderView> {
  const response = await sdkUpdateProvider(id, input);
  return unwrap<ProviderView>(response);
}

export async function deleteProvider(id: string): Promise<void> {
  await sdkDeleteProvider(id);
}

export async function discoverModels(
  input: DiscoverModelsInput,
  options?: { signal?: AbortSignal },
): Promise<DiscoverModelsResult> {
  const response = await sdkDiscoverProviderModels(
    input,
    options?.signal ? { signal: options.signal } : undefined,
  );
  return unwrap<DiscoverModelsResult>(response);
}
