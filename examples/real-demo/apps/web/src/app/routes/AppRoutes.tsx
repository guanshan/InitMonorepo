import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { environment } from "../../shared/config/env";
import { AppShell } from "../../shared/ui/AppShell";
import { ErrorBoundary } from "../../shared/ui/ErrorBoundary";
import { LoadingState } from "../../shared/ui/LoadingState";

const HomePage = lazy(() =>
  import("../../pages/home/HomePage").then((m) => ({ default: m.HomePage })),
);
const UserListPage = lazy(() =>
  import("../../pages/user-list/UserListPage").then((m) => ({
    default: m.UserListPage,
  })),
);
const UserCreatePage = lazy(() =>
  import("../../pages/user-create/UserCreatePage").then((m) => ({
    default: m.UserCreatePage,
  })),
);
const UserDetailPage = lazy(() =>
  import("../../pages/user-detail/UserDetailPage").then((m) => ({
    default: m.UserDetailPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("../../pages/not-found/NotFoundPage").then((m) => ({
    default: m.NotFoundPage,
  })),
);

const PageFallback = () => {
  const { t } = useTranslation();

  return (
    <LoadingState
      description={t("routeFallback.description")}
      title={t("routeFallback.title")}
    />
  );
};

export const AppRoutes = () => (
  <BrowserRouter basename={environment.appBasePath}>
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<HomePage />} path="/" />
            <Route element={<UserListPage />} path="/users" />
            <Route element={<UserCreatePage />} path="/users/new" />
            <Route element={<UserDetailPage />} path="/users/:userId" />
            <Route element={<NotFoundPage />} path="*" />
          </Routes>
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  </BrowserRouter>
);
