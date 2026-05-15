import {
  ApiFailureSchema,
  SystemSettingsResponseSchema,
  UpdateSystemSettingsInputSchema,
} from "@real-demo/shared";
import { createZodDto } from "nestjs-zod";

export { UpdateSystemSettingsInputSchema };

export class UpdateSystemSettingsDto extends createZodDto(
  UpdateSystemSettingsInputSchema,
) {}
export class SystemSettingsResponseDto extends createZodDto(
  SystemSettingsResponseSchema,
) {}
export class SettingsApiFailureDto extends createZodDto(ApiFailureSchema) {}
