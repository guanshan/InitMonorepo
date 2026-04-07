export type ThemePreference = "dark" | "light" | "system";

export const resolveThemePreference = (preference: ThemePreference) => {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return preference;
};
