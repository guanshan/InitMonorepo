import { describe, expect, it } from "vitest";

import { paginatedResponse, successResponse } from "./success-response";

describe("successResponse", () => {
  it("creates a consistent meta envelope", () => {
    const response = successResponse(
      {
        id: "user_123",
      },
      {
        cached: true,
        requestId: "req_fixed123",
      },
    );

    expect(response.success).toBe(true);
    expect(response.data).toEqual({
      id: "user_123",
    });
    expect(response.meta).toMatchObject({
      cached: true,
      requestId: "req_fixed123",
    });
    expect(new Date(response.meta.timestamp).toISOString()).toBe(
      response.meta.timestamp,
    );
  });
});

describe("paginatedResponse", () => {
  it("creates a paginated envelope with consistent metadata", () => {
    const response = paginatedResponse(
      [
        {
          id: "user_123",
        },
      ],
      {
        page: 2,
        pageSize: 10,
        totalItems: 25,
      },
      {
        requestId: "req_page123",
      },
    );

    expect(response.success).toBe(true);
    expect(response.pagination).toEqual({
      page: 2,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
    expect(response.meta).toMatchObject({
      requestId: "req_page123",
    });
    expect(new Date(response.meta.timestamp).toISOString()).toBe(
      response.meta.timestamp,
    );
  });
});
