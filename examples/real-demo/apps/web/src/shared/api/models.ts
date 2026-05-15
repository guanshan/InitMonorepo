import {
  createModel as sdkCreateModel,
  deleteModel as sdkDeleteModel,
  getModel as sdkGetModel,
  listModels as sdkListModels,
  updateModel as sdkUpdateModel,
  verifyModel as sdkVerifyModel,
} from "@real-demo/sdk";
import type {
  CreateModelDefInput,
  ModelListQuery,
  ModelView,
  UpdateModelDefInput,
  VerifyModelResult,
} from "@real-demo/shared";

type SdkEnvelope<T> = {
  success: true;
  data: T;
};

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as SdkEnvelope<T>;
  return body.data;
};

export async function listModels(
  query: Partial<ModelListQuery> = {},
  options?: { signal?: AbortSignal },
): Promise<ModelView[]> {
  const response = await sdkListModels(
    {
      ...(query.search ? { search: query.search } : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
    },
    options?.signal ? { signal: options.signal } : undefined,
  );
  return unwrap<ModelView[]>(response);
}

export async function getModel(modelId: string): Promise<ModelView> {
  const response = await sdkGetModel(modelId);
  return unwrap<ModelView>(response);
}

export async function createModel(
  input: CreateModelDefInput,
): Promise<ModelView> {
  const response = await sdkCreateModel(input);
  return unwrap<ModelView>(response);
}

export async function updateModel(
  modelId: string,
  input: UpdateModelDefInput,
): Promise<ModelView> {
  const response = await sdkUpdateModel(modelId, input);
  return unwrap<ModelView>(response);
}

export async function deleteModel(modelId: string): Promise<void> {
  await sdkDeleteModel(modelId);
}

export async function verifyModel(
  modelId: string,
): Promise<VerifyModelResult> {
  const response = await sdkVerifyModel(modelId);
  return unwrap<VerifyModelResult>(response);
}
