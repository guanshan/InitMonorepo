import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

import { environment } from "../config/env";

const fallbackLocale = "en";

const resolveLocale = (resources: Resource) =>
  environment.defaultLocale in resources ? environment.defaultLocale : fallbackLocale;

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

export { i18n };
