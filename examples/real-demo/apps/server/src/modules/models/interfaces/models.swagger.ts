import {
  ApiFailureSchema,
  ConfigSnapshotResponseSchema,
  CreateModelDefInputSchema,
  CreateProviderInputSchema,
  DiscoverModelsInputSchema,
  DiscoverModelsResponseSchema,
  ModelListQuerySchema,
  ModelListResponseSchema,
  ModelResponseSchema,
  MutationResponseSchema,
  PlaygroundRunInputSchema,
  PlaygroundRunResponseSchema,
  PlaygroundStreamInputSchema,
  ProviderListResponseSchema,
  ProviderResponseSchema,
  UpdateModelDefInputSchema,
  UpdateProviderInputSchema,
  VerifyModelResponseSchema,
} from "@real-demo/shared";
import { createZodDto } from "nestjs-zod";

export {
  CreateModelDefInputSchema,
  CreateProviderInputSchema,
  DiscoverModelsInputSchema,
  ModelListQuerySchema,
  PlaygroundRunInputSchema,
  PlaygroundStreamInputSchema,
  UpdateModelDefInputSchema,
  UpdateProviderInputSchema,
};

// Models
export class CreateModelDto extends createZodDto(CreateModelDefInputSchema) {}
export class UpdateModelDto extends createZodDto(UpdateModelDefInputSchema) {}
export class ModelListQueryDto extends createZodDto(ModelListQuerySchema) {}
export class ModelResponseDto extends createZodDto(ModelResponseSchema) {}
export class ModelListResponseDto extends createZodDto(ModelListResponseSchema) {}
export class VerifyModelResponseDto extends createZodDto(VerifyModelResponseSchema) {}

// Providers
export class CreateProviderDto extends createZodDto(CreateProviderInputSchema) {}
export class UpdateProviderDto extends createZodDto(UpdateProviderInputSchema) {}
export class ProviderResponseDto extends createZodDto(ProviderResponseSchema) {}
export class ProviderListResponseDto extends createZodDto(ProviderListResponseSchema) {}
export class DiscoverModelsDto extends createZodDto(DiscoverModelsInputSchema) {}
export class DiscoverModelsResponseDto extends createZodDto(
  DiscoverModelsResponseSchema,
) {}

// Config export (read-only snapshot)
export class ConfigSnapshotResponseDto extends createZodDto(
  ConfigSnapshotResponseSchema,
) {}

// Playground
export class PlaygroundRunDto extends createZodDto(PlaygroundRunInputSchema) {}
export class PlaygroundRunResponseDto extends createZodDto(
  PlaygroundRunResponseSchema,
) {}
export class PlaygroundStreamDto extends createZodDto(
  PlaygroundStreamInputSchema,
) {}

export class MutationResponseDto extends createZodDto(MutationResponseSchema) {}
export class ModelsApiFailureDto extends createZodDto(ApiFailureSchema) {}
