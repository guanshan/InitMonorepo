import type { ThemePreference } from "@real-demo/ui";
import { resolveThemePreference } from "@real-demo/ui";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { environment } from "../config/env";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: environment.defaultTheme,
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: "real-demo-theme",
    },
  ),
);

export const resolveTheme = resolveThemePreference;
