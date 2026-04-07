import { z } from "zod";

export const ApiMetaSchema = z
  .object({
    requestId: z.string(),
    timestamp: z.string().datetime(),
    cached: z.boolean().optional(),
  })
  .strict();

export const ApiErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

export const createApiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z
    .object({
      success: z.literal(true),
      data,
      meta: ApiMetaSchema,
    })
    .strict();

export const PaginationSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
  .strict();

export const createApiPaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      success: z.literal(true),
      data: z.array(item),
      pagination: PaginationSchema,
      meta: ApiMetaSchema,
    })
    .strict();

export const ApiFailureSchema = z
  .object({
    success: z.literal(false),
    error: ApiErrorSchema,
    issues: z.unknown().optional(),
    meta: ApiMetaSchema,
  })
  .strict();

export type ApiMeta = z.infer<typeof ApiMetaSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
