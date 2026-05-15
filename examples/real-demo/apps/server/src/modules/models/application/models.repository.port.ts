import type { ModelDef, ModelCapabilities } from "@real-demo/shared";

export const MODELS_REPOSITORY_PORT = Symbol("MODELS_REPOSITORY_PORT");

export interface ModelRecord extends ModelDef {
  lastVerifiedAt: string | null;
  lastError: string | null;
}

export type ModelCreateInput = ModelDef;

export interface ModelUpdateInput {
  name?: string;
  providerId?: string;
  model?: string;
  description?: string;
  capabilities?: ModelCapabilities;
  enabled?: boolean;
  temperature?: number | null;
  maxTokens?: number | null;
}

export interface ModelVerificationPatch {
  lastVerifiedAt: string | null;
  lastError: string | null;
}

export interface ModelsRepositoryPort {
  findAll(): Promise<ModelRecord[]>;
  findByKey(modelKey: string): Promise<ModelRecord | null>;
  create(input: ModelCreateInput): Promise<ModelRecord>;
  update(modelKey: string, patch: ModelUpdateInput): Promise<ModelRecord>;
  delete(modelKey: string): Promise<void>;
  setVerification(
    modelKey: string,
    patch: ModelVerificationPatch,
  ): Promise<void>;
  clearVerificationForProvider(providerKey: string): Promise<void>;
}
