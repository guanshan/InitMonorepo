import type { ProviderDef } from "@real-demo/shared";

export const PROVIDERS_REPOSITORY_PORT = Symbol("PROVIDERS_REPOSITORY_PORT");

/**
 * Row shape returned from the repository — `apiKey` is **plaintext** (the repo
 * is the only layer that touches ciphertext). `apiKeyPreview` is stored on the
 * row so the list view doesn't have to decrypt every key.
 */
export interface ProviderRecord extends ProviderDef {
  apiKeyPreview: string;
  lastVerifiedAt: string | null;
  lastError: string | null;
}

export type ProviderCreateInput = ProviderDef;

export interface ProviderUpdateInput {
  name?: string;
  type?: ProviderDef["type"];
  vendor?: ProviderDef["vendor"];
  baseUrl?: string;
  /** `undefined` = keep existing ciphertext; non-empty string = re-encrypt. */
  apiKey?: string;
}

export interface ProviderVerificationPatch {
  lastVerifiedAt: string | null;
  lastError: string | null;
}

export interface ProvidersRepositoryPort {
  findAll(): Promise<ProviderRecord[]>;
  findByKey(providerKey: string): Promise<ProviderRecord | null>;
  create(input: ProviderCreateInput): Promise<ProviderRecord>;
  update(
    providerKey: string,
    patch: ProviderUpdateInput,
  ): Promise<ProviderRecord>;
  delete(providerKey: string): Promise<void>;
  setVerification(
    providerKey: string,
    patch: ProviderVerificationPatch,
  ): Promise<void>;
}
