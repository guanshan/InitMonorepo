import { useEffect } from "react";

import { resolveTheme, useThemeStore } from "../store/theme-store";

export const ThemeEffect = () => {
  const preference = useThemeStore((state) => state.preference);

  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveTheme(preference);
    };

    applyTheme();

    if (preference !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [preference]);

  return null;
};
