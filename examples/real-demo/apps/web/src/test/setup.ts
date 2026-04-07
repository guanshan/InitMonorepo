import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

import { resources } from "../locales/resources";
import { initializeI18n } from "../shared/lib/i18n";
import { useRequestFeedbackStore } from "../shared/store/request-feedback-store";
import { useThemeStore } from "../shared/store/theme-store";
import { server } from "./server";

initializeI18n(resources);

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
  });
});

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  });

  useThemeStore.persist.clearStorage();
  useThemeStore.setState({
    preference: "system",
  });
  useRequestFeedbackStore.setState({
    items: [],
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterAll(() => {
  server.close();
});
