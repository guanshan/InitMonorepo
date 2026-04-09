import type { ReactNode } from "react";

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";

import "@real-demo/ui/styles.css";
import "../styles/global.css";

import { defaultMeta } from "./route-meta";
import { AppProviders } from "./providers/AppProviders";
import { ErrorBoundary as AppErrorBoundary } from "../shared/ui/ErrorBoundary";
import { AppShell } from "../shared/ui/AppShell";
import { ErrorState } from "../shared/ui/ErrorState";
import { LoadingState } from "../shared/ui/LoadingState";
import { environment } from "../shared/config/env";
import { resources } from "../locales/resources";
import { initializeI18n } from "../shared/lib/i18n";

const APP_RUNTIME_API_BASE_URL_SENTINEL = "__APP_RUNTIME_API_BASE_URL__";
const i18n = initializeI18n(resources);
const runtimeConfigScript = `window.__APP_CONFIG__ = window.__APP_CONFIG__ ?? { APP_RUNTIME_API_BASE_URL: "${APP_RUNTIME_API_BASE_URL_SENTINEL}" };`;

export const meta = defaultMeta;

export const links = () => [
  { rel: "icon", type: "image/svg+xml", href: `${import.meta.env.BASE_URL}favicon.svg` },
];

const renderDocument = (content: ReactNode) => (
  <html lang={environment.defaultLocale}>
    <head>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <Meta />
      <Links />
    </head>
    <body>
      <AppProviders>
        <AppErrorBoundary>
          <AppShell>{content}</AppShell>
        </AppErrorBoundary>
      </AppProviders>
      <ScrollRestoration />
      <script dangerouslySetInnerHTML={{ __html: runtimeConfigScript }} />
      <Scripts />
    </body>
  </html>
);

export default function Root() {
  return renderDocument(<Outlet />);
}

export function HydrateFallback() {
  return renderDocument(
    <LoadingState
      description={i18n.t("routeFallback.description")}
      title={i18n.t("routeFallback.title")}
    />,
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return renderDocument(
      <ErrorState
        description={i18n.t("notFound.description")}
        title={i18n.t("notFound.title")}
      />,
    );
  }

  return renderDocument(
    <ErrorState
      description={i18n.t("errorBoundary.description")}
      title={i18n.t("errorBoundary.title")}
    />,
  );
}
