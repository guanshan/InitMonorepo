import type { z } from "zod";

import type {
  ConfigSnapshotSchema,
  CreateModelDefInputSchema,
  CreateProviderInputSchema,
  DiscoverModelItemSchema,
  DiscoverModelsInputSchema,
  DiscoverModelsResultSchema,
  ModelCapabilitiesSchema,
  ModelDefSchema,
  ModelListQuerySchema,
  ModelViewSchema,
  PlaygroundMessageSchema,
  PlaygroundRunInputSchema,
  PlaygroundRunResultSchema,
  PlaygroundStreamInputSchema,
  ProviderDefSchema,
  ProviderTypeSchema,
  ProviderVendorSchema,
  ProviderViewSchema,
  UpdateModelDefInputSchema,
  UpdateProviderInputSchema,
  VerifyModelResultSchema,
} from "../schemas/model.js";

export type ProviderType = z.infer<typeof ProviderTypeSchema>;
export type ProviderVendor = z.infer<typeof ProviderVendorSchema>;
export type ProviderDef = z.infer<typeof ProviderDefSchema>;
export type ProviderView = z.infer<typeof ProviderViewSchema>;
export type CreateProviderInput = z.infer<typeof CreateProviderInputSchema>;
export type UpdateProviderInput = z.infer<typeof UpdateProviderInputSchema>;

export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>;
export type ModelDef = z.infer<typeof ModelDefSchema>;
export type ModelView = z.infer<typeof ModelViewSchema>;
export type CreateModelDefInput = z.infer<typeof CreateModelDefInputSchema>;
export type UpdateModelDefInput = z.infer<typeof UpdateModelDefInputSchema>;
export type ModelListQuery = z.infer<typeof ModelListQuerySchema>;

export type ConfigSnapshot = z.infer<typeof ConfigSnapshotSchema>;

export type VerifyModelResult = z.infer<typeof VerifyModelResultSchema>;
export type DiscoverModelsInput = z.infer<typeof DiscoverModelsInputSchema>;
export type DiscoverModelItem = z.infer<typeof DiscoverModelItemSchema>;
export type DiscoverModelsResult = z.infer<typeof DiscoverModelsResultSchema>;

export type PlaygroundMessage = z.infer<typeof PlaygroundMessageSchema>;
export type PlaygroundRunInput = z.infer<typeof PlaygroundRunInputSchema>;
export type PlaygroundRunResult = z.infer<typeof PlaygroundRunResultSchema>;
export type PlaygroundStreamInput = z.infer<typeof PlaygroundStreamInputSchema>;
