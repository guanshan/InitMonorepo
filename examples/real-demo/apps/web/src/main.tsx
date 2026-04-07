import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";
import { resources } from "./locales/resources";
import { environment } from "./shared/config/env";
import { initializeI18n } from "./shared/lib/i18n";
import "@real-demo/ui/styles.css";
import "./styles/global.css";

const i18n = initializeI18n(resources);

document.title = i18n.t("app.title", {
  appName: environment.appName,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
