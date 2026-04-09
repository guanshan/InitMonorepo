import { afterEach, describe, expect, it } from "vitest";

import { loadEnvironment } from "./env";

const originalTrustProxy = process.env.TRUST_PROXY;

describe("loadEnvironment", () => {
  afterEach(() => {
    if (originalTrustProxy === undefined) {
      delete process.env.TRUST_PROXY;
      return;
    }

    process.env.TRUST_PROXY = originalTrustProxy;
  });

  it("defaults TRUST_PROXY to false when not set", () => {
    delete process.env.TRUST_PROXY;

    expect(loadEnvironment().trustProxy).toBe(false);
  });

  it("allows disabling proxy trust explicitly", () => {
    process.env.TRUST_PROXY = "false";

    expect(loadEnvironment().trustProxy).toBe(false);
  });

  it("parses comma-separated trusted proxy lists", () => {
    process.env.TRUST_PROXY = "loopback, 203.0.113.10";

    expect(loadEnvironment().trustProxy).toEqual([
      "loopback",
      "203.0.113.10",
    ]);
  });
});
