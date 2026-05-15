import {
  Anthropic,
  Azure,
  DeepSeek,
  Fireworks,
  Hunyuan,
  Kimi,
  Minimax,
  Ollama,
  OpenAI,
  OpenRouter,
  Zhipu,
} from "@lobehub/icons";
import type { ProviderVendor } from "@real-demo/shared";
import type { ComponentType } from "react";

import { CpuIcon } from "./icons";

interface ProviderLogoProps {
  vendor: ProviderVendor;
  size?: number;
}

// Lobe icons' generic Icon components accept `size?: number | string`, but
// `*.Avatar` variants narrow `size` to `number`. Cast at the registry boundary
// instead of bifurcating the union — every call site passes a real number.
type LobeIconComponent = ComponentType<{ size?: number | string }>;

const REGISTRY: Partial<Record<ProviderVendor, LobeIconComponent>> = {
  openai: OpenAI,
  anthropic: Anthropic,
  deepseek: DeepSeek.Color,
  openrouter: OpenRouter,
  kimi: Kimi.Avatar as unknown as LobeIconComponent,
  glm: Zhipu.Color,
  minimax: Minimax.Color,
  hunyuan: Hunyuan.Color,
  azure: Azure.Color,
  fireworks: Fireworks.Color,
  ollama: Ollama,
};

export const ProviderLogo = ({ vendor, size = 14 }: ProviderLogoProps) => {
  const Icon = REGISTRY[vendor];
  if (!Icon) return <CpuIcon size={size} />;
  return <Icon size={size} />;
};
