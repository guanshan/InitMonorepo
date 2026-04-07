interface SuccessResponseMetaInput {
  cached?: boolean;
  requestId: string;
}

export const successResponse = <T>(data: T, meta: SuccessResponseMetaInput) => ({
  success: true as const,
  data,
  meta: {
    ...(meta.cached !== undefined ? { cached: meta.cached } : {}),
    requestId: meta.requestId,
    timestamp: new Date().toISOString(),
  },
});

interface PaginationInput {
  page: number;
  pageSize: number;
  totalItems: number;
}

export const paginatedResponse = <T>(
  data: T[],
  pagination: PaginationInput,
  meta: SuccessResponseMetaInput,
) => ({
  success: true as const,
  data,
  pagination: {
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    totalPages: Math.ceil(pagination.totalItems / pagination.pageSize),
  },
  meta: {
    ...(meta.cached !== undefined ? { cached: meta.cached } : {}),
    requestId: meta.requestId,
    timestamp: new Date().toISOString(),
  },
});
