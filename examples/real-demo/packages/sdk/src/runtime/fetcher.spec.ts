import { afterEach, describe, expect, it, vi } from "vitest";

import { customFetcher } from "./fetcher";

describe("customFetcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefixes relative requests with the provided baseUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ ok: true }),
      ok: true,
      status: 200,
    });

    vi.stubGlobal("fetch", fetchMock);

    await customFetcher("/api/users", {
      baseUrl: "https://api.example.com/root/",
      method: "GET",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/root/api/users",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("bridges AbortSignal instances that come from a different runtime", async () => {
    const requestSignal = {
      aborted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal;
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ ok: true }),
      ok: true,
      status: 200,
    });

    vi.stubGlobal("fetch", fetchMock);

    await customFetcher("/api/users", {
      method: "GET",
      signal: requestSignal,
    });

    expect(requestSignal.addEventListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
      { once: true },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock.mock.calls[0]?.[1]?.signal).not.toBe(requestSignal);
    expect(requestSignal.removeEventListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
    );
  });

  it("throws an ApiRequestError with status metadata for failed responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          error: {
            code: "user_not_found",
            message: "The requested user could not be found.",
          },
        }),
        ok: false,
        status: 404,
      }),
    );

    await expect(customFetcher("/api/users/user_missing")).rejects.toMatchObject({
      code: "user_not_found",
      message: "The requested user could not be found.",
      status: 404,
    });
  });
});
