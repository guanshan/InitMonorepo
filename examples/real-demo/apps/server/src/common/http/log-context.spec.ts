import { afterEach, describe, expect, it } from "vitest";

import { getLogModule } from "./log-context";

const originalAppBasePath = process.env.APP_BASE_PATH;

describe("getLogModule", () => {
  afterEach(() => {
    if (originalAppBasePath === undefined) {
      delete process.env.APP_BASE_PATH;
      return;
    }

    process.env.APP_BASE_PATH = originalAppBasePath;
  });

  it("maps versioned api paths to the business module", () => {
    process.env.APP_BASE_PATH = "/";

    expect(getLogModule("/api/v1/users")).toBe("users");
    expect(getLogModule("/api/v1/users/user_1")).toBe("users");
  });

  it("keeps docs and health routes stable", () => {
    process.env.APP_BASE_PATH = "/";

    expect(getLogModule("/api/docs")).toBe("docs");
    expect(getLogModule("/health")).toBe("health");
  });

  it("normalizes app base paths before resolving versioned api modules", () => {
    process.env.APP_BASE_PATH = "/real-demo";

    expect(getLogModule("/real-demo/api/v1/users")).toBe("users");
  });
});
