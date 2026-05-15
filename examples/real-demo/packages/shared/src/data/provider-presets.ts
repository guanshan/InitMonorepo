import type { ProviderType, ProviderVendor } from "../types/model.js";

export interface ProviderPreset {
  /** Suggested kebab-case id when the user clicks this chip. */
  id: string;
  /** Display name for the chip and the form's default `name`. */
  name: string;
  type: ProviderType;
  vendor: ProviderVendor;
  baseUrl: string;
}

/**
 * Quick-start vendor presets surfaced as chips in the "Add provider" form.
 * Clicking a chip pre-fills `id` / `name` / `type` / `vendor` / `baseUrl`;
 * the user only has to paste an API key and hit Save.
 *
 * Order is roughly "most likely to be tried first" — keep the popular
 * frontier-model vendors at the top.
 */
export const PROVIDER_PRESETS: ReadonlyArray<ProviderPreset> = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    vendor: "openai",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "anthropic",
    vendor: "anthropic",
    baseUrl: "https://api.anthropic.com",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "openai-compatible",
    vendor: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openai-compatible",
    vendor: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    type: "openai-compatible",
    vendor: "kimi",
    baseUrl: "https://api.moonshot.cn/v1",
  },
  {
    id: "glm",
    name: "Zhipu GLM",
    type: "openai-compatible",
    vendor: "glm",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  },
  {
    id: "minimax",
    name: "MiniMax",
    type: "openai-compatible",
    vendor: "minimax",
    baseUrl: "https://api.minimax.chat/v1",
  },
  {
    id: "hunyuan",
    name: "Hunyuan",
    type: "openai-compatible",
    vendor: "hunyuan",
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    type: "openai-compatible",
    vendor: "fireworks",
    baseUrl: "https://api.fireworks.ai/inference/v1",
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    type: "openai-compatible",
    vendor: "azure",
    // Azure deployments are per-resource; the operator must paste the
    // full `https://<resource>.openai.azure.com/openai/deployments/<id>`
    // URL after picking this preset. The blank baseUrl is intentional.
    baseUrl: "",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    type: "openai-compatible",
    vendor: "ollama",
    baseUrl: "http://localhost:11434/v1",
  },
  {
    id: "custom",
    name: "Custom",
    type: "openai-compatible",
    vendor: "custom",
    baseUrl: "",
  },
];
