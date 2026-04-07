import { Button } from "@real-demo/ui";
import { useTranslation } from "react-i18next";

import { useThemeStore } from "../store/theme-store";

const preferences = ["system", "light", "dark"] as const;

export const ThemeToggle = () => {
  const { t } = useTranslation();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const currentIndex = preferences.indexOf(preference);
  const nextPreference = preferences[(currentIndex + 1) % preferences.length] ?? "system";

  return (
    <Button onClick={() => setPreference(nextPreference)} variant="secondary">
      {t("theme.toggle", {
        theme: t(`theme.${preference}`),
      })}
    </Button>
  );
};
