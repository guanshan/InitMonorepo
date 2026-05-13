import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

import { environment } from "../config/env";

const fallbackLocale = "en";

export const LANGUAGE_STORAGE_KEY = "real-demo-language";

const readStoredLanguage = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const resolveLocale = (resources: Resource): string => {
  const stored = readStoredLanguage();
  if (stored && stored in resources) {
    return stored;
  }
  return environment.defaultLocale in resources
    ? environment.defaultLocale
    : fallbackLocale;
};

export const initializeI18n = (resources: Resource) => {
  if (i18n.isInitialized) {
    return i18n;
  }

  void i18n.use(initReactI18next).init({
    fallbackLng: fallbackLocale,
    interpolation: {
      escapeValue: false,
    },
    lng: resolveLocale(resources),
    resources,
  });

  return i18n;
};

export const persistLanguage = (language: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // storage disabled — preference will reset on reload
  }
};

export { i18n };
