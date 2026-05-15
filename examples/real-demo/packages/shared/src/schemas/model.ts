import { z } from "zod";

import {
  createApiPaginatedSchema,
  createApiSuccessSchema,
} from "../contracts/api-envelope.js";

/* -------------------------------------------------------------------------- */
/* Identifier conventions                                                     */
/* -------------------------------------------------------------------------- */

const IdSchema = z
  .string()
  .trim()
  .min(1, "validation.id.required")
  .max(64, "validation.id.tooLong")
  .regex(/^[a-z0-9][a-z0-9-_.]*$/i, "validation.id.invalid");

/* -------------------------------------------------------------------------- */
/* Providers                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The transport flavour used to talk to the upstream API.
 * Vendor branding (DeepSeek, Kimi, OpenRouter…) is independent and stored on
 * `vendor` so we can show the right logo without coupling routing to it.
 */
export const ProviderTypeSchema = z.enum([
  "openai",
  "anthropic",
  "openai-compatible",
]);

export const ProviderVendorSchema = z.enum([
  "openai",
  "anthropic",
  "deepseek",
  "openrouter",
  "kimi",
  "glm",
  "minimax",
  "hunyuan",
  "azure",
  "fireworks",
  "ollama",
  "custom",
]);

/** Raw provider definition — `apiKey` is plaintext on the wire. */
export const ProviderDefSchema = z
  .object({
    id: IdSchema,
    name: z.string().trim().min(1).max(128),
    type: ProviderTypeSchema,
    vendor: ProviderVendorSchema.default("custom"),
    baseUrl: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .refine((v) => /^https?:\/\//i.test(v), "validation.baseUrl.invalid"),
    apiKey: z.string().min(1).max(2048),
  })
  .strict();

/** API-facing view of a provider: never exposes the raw key. */
export const ProviderViewSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: ProviderTypeSchema,
    vendor: ProviderVendorSchema,
    baseUrl: z.string(),
    apiKeyPreview: z.string(),
    hasKey: z.boolean(),
    lastVerifiedAt: z.string().datetime().nullable(),
    lastError: z.string().nullable(),
  })
  .strict();

export const CreateProviderInputSchema = ProviderDefSchema;
export const UpdateProviderInputSchema = ProviderDefSchema.partial().strict();

/* -------------------------------------------------------------------------- */
/* Models                                                                     */
/* -------------------------------------------------------------------------- */

export const ModelCapabilitiesSchema = z
  .object({
    vision: z.boolean().default(false),
    tools: z.boolean().default(false),
    json: z.boolean().default(false),
    reasoning: z.boolean().default(false),
    streaming: z.boolean().default(true),
  })
  .strict();

/**
 * Model definition. `temperature` / `maxTokens` are optional overrides;
 * fall back to hard defaults (0.7, 65536) at request time.
 */
export const ModelDefSchema = z
  .object({
    id: IdSchema,
    name: z.string().trim().min(1).max(128),
    providerId: IdSchema,
    model: z.string().trim().min(1).max(191),
    description: z.string().trim().max(500).default(""),
    capabilities: ModelCapabilitiesSchema.default({
      vision: false,
      tools: false,
      json: false,
      reasoning: false,
      streaming: true,
    }),
    enabled: z.boolean().default(true),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(1_048_576).optional(),
  })
  .strict();

/**
 * Flattened "view" of a model returned to the UI — embeds the provider view,
 * the effective parameters, and runtime verification state.
 */
export const ModelViewSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    model: z.string(),
    enabled: z.boolean(),
    capabilities: ModelCapabilitiesSchema,
    temperature: z.number(),
    maxTokens: z.number().int(),
    provider: ProviderViewSchema,
    lastVerifiedAt: z.string().datetime().nullable(),
    lastError: z.string().nullable(),
  })
  .strict();

export const CreateModelDefInputSchema = ModelDefSchema;
export const UpdateModelDefInputSchema = ModelDefSchema.partial().strict();

/* -------------------------------------------------------------------------- */
/* Snapshot (read-only export)                                                */
/* -------------------------------------------------------------------------- */

export const ConfigSnapshotSchema = z
  .object({
    providers: z.array(ProviderViewSchema),
    models: z.array(ModelViewSchema),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Discover / verify                                                          */
/* -------------------------------------------------------------------------- */

export const VerifyModelResultSchema = z
  .object({
    success: z.boolean(),
    latencyMs: z.number().int().min(0),
    message: z.string().nullable(),
  })
  .strict();

export const DiscoverModelsInputSchema = z
  .object({
    /** Either provide an existing modelId, or providerId, or raw baseUrl+apiKey. */
    modelId: z.string().trim().max(64).optional(),
    providerId: z.string().trim().max(64).optional(),
    type: ProviderTypeSchema.optional(),
    baseUrl: z.string().trim().max(512).optional(),
    apiKey: z.string().trim().max(2048).optional(),
  })
  .strict()
  .refine(
    (v) =>
      (v.baseUrl && v.apiKey && v.type) || v.providerId || v.modelId,
    {
      message:
        "Provide a modelId, a providerId, or a (type + baseUrl + apiKey) triple.",
      path: ["apiKey"],
    },
  );

export const DiscoverModelItemSchema = z
  .object({
    id: z.string(),
    label: z.string().nullable(),
  })
  .strict();

export const DiscoverModelsResultSchema = z
  .object({
    models: z.array(DiscoverModelItemSchema),
    latencyMs: z.number().int().min(0),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Playground I/O                                                             */
/* -------------------------------------------------------------------------- */

export const PlaygroundMessageSchema = z
  .object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1).max(32_000),
  })
  .strict();

export const PlaygroundRunInputSchema = z
  .object({
    modelId: z.string().min(1).max(64),
    messages: z.array(PlaygroundMessageSchema).min(1).max(100),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(1_048_576).optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    stop: z.array(z.string().min(1).max(64)).max(4).optional(),
  })
  .strict();

// AI SDK UIMessage shape, validated leniently here — `convertToModelMessages`
// in the controller does the real shape check and surfaces a clean error.
// The strict role enum + capped array length still guard against runaway
// payloads from the public endpoint.
const PlaygroundStreamUIMessageSchema = z
  .object({
    id: z.string().max(128),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.unknown()).max(64),
    metadata: z.unknown().optional(),
  })
  .passthrough();

export const PlaygroundStreamInputSchema = z
  .object({
    modelId: z.string().min(1).max(64),
    system: z.string().max(32_000).optional(),
    messages: z.array(PlaygroundStreamUIMessageSchema).min(1).max(100),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(1_048_576).optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    stop: z.array(z.string().min(1).max(64)).max(4).optional(),
    vendor: z.string().max(64).optional(),
    // AI SDK's `DefaultChatTransport` stamps these on every request; declare
    // them here so the server-side `.strict()` validator doesn't reject the
    // payload. We don't otherwise use them — chat history is the client's
    // local concern.
    id: z.string().max(128).optional(),
    trigger: z
      .enum(["submit-message", "regenerate-message"])
      .optional(),
    messageId: z.string().max(128).optional().nullable(),
  })
  .strict();

export const PlaygroundRunResultSchema = z
  .object({
    content: z.string(),
    latencyMs: z.number().int().min(0),
    usage: z
      .object({
        promptTokens: z.number().int().nullable(),
        completionTokens: z.number().int().nullable(),
        totalTokens: z.number().int().nullable(),
      })
      .nullable(),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* List query                                                                 */
/* -------------------------------------------------------------------------- */

export const ModelListQuerySchema = z
  .object({
    search: z.string().trim().max(128).optional(),
    providerId: z.string().trim().max(64).optional(),
    enabled: z.coerce.boolean().optional(),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* API envelopes                                                              */
/* -------------------------------------------------------------------------- */

export const ProviderListResponseSchema = createApiSuccessSchema(
  z.array(ProviderViewSchema),
);
export const ProviderResponseSchema = createApiSuccessSchema(ProviderViewSchema);

export const ModelListResponseSchema = createApiSuccessSchema(
  z.array(ModelViewSchema),
);
export const ModelResponseSchema = createApiSuccessSchema(ModelViewSchema);

export const ConfigSnapshotResponseSchema = createApiSuccessSchema(ConfigSnapshotSchema);
export const MutationResponseSchema = createApiSuccessSchema(
  z.object({ changed: z.boolean() }).strict(),
);
export const VerifyModelResponseSchema =
  createApiSuccessSchema(VerifyModelResultSchema);
export const DiscoverModelsResponseSchema = createApiSuccessSchema(
  DiscoverModelsResultSchema,
);
export const PlaygroundRunResponseSchema =
  createApiSuccessSchema(PlaygroundRunResultSchema);

/* -------------------------------------------------------------------------- */
/* Compatibility re-exports for already-paginated responses (kept for now)    */
/* -------------------------------------------------------------------------- */

export const ModelPaginatedResponseSchema =
  createApiPaginatedSchema(ModelViewSchema);
