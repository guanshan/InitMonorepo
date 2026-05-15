import { Injectable } from "@nestjs/common";
import type { ProviderType } from "@real-demo/shared";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

import type { ProviderRecord } from "./providers.repository.port";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/g, "");

const ensureV1 = (baseUrl: string): string => {
  const trimmed = stripTrailingSlash(baseUrl.trim());
  return /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
};

const normalizeBaseUrl = (type: ProviderType, baseUrl: string): string => {
  // The Anthropic SDK appends its own /v1; pass the bare host.
  if (type === "anthropic") return stripTrailingSlash(baseUrl.trim());
  return ensureV1(baseUrl);
};

@Injectable()
export class ProviderResolver {
  /** Build a LanguageModel from a fully-resolved provider record + model ident. */
  build(provider: ProviderRecord, modelKey: string): LanguageModel {
    const baseURL = normalizeBaseUrl(provider.type, provider.baseUrl);
    const apiKey = provider.apiKey;
    switch (provider.type) {
      case "openai":
        return createOpenAI({ baseURL, apiKey })(modelKey);
      case "anthropic":
        return createAnthropic({ baseURL, apiKey })(modelKey);
      case "openai-compatible":
        return createOpenAICompatible({
          name: provider.id,
          baseURL,
          apiKey,
        })(modelKey);
    }
  }

  /** Build with completely ad-hoc credentials — used by the verify-before-save flow. */
  buildAdHoc(
    type: ProviderType,
    baseUrl: string,
    apiKey: string,
    modelKey: string,
  ): LanguageModel {
    return this.build(
      {
        id: "ad-hoc",
        name: "ad-hoc",
        type,
        vendor: "custom",
        baseUrl,
        apiKey,
        apiKeyPreview: "",
        lastVerifiedAt: null,
        lastError: null,
      },
      modelKey,
    );
  }
}
