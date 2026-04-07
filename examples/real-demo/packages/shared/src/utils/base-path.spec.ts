import { describe, expect, it } from "vitest";

import { joinUrlPath, normalizeBasePath } from "./base-path";

describe("normalizeBasePath", () => {
  it("normalizes empty and duplicate separators to root", () => {
    expect(normalizeBasePath("")).toBe("/");
    expect(normalizeBasePath("//")).toBe("/");
  });

  it("adds a leading slash and trims a trailing slash", () => {
    expect(normalizeBasePath("real-demo/")).toBe("/real-demo");
  });
});

describe("joinUrlPath", () => {
  it("joins a root base path without duplicating separators", () => {
    expect(joinUrlPath("/", "api/docs")).toBe("/api/docs");
  });

  it("joins a nested base path with a relative segment", () => {
    expect(joinUrlPath("/real-demo", "/api")).toBe("/real-demo/api");
  });
});
