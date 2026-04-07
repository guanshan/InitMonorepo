import { ApiRequestError } from "@real-demo/sdk/types";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { environment } from "../config/env";
import { i18n } from "../lib/i18n";
import { getUserFacingErrorMessage } from "../lib/user-facing-error";
import { enqueueRequestFeedback } from "../store/request-feedback-store";

const reportRequestError = (error: unknown) => {
  if (error instanceof ApiRequestError && error.status === 401) {
    enqueueRequestFeedback({
      description: i18n.t("requestFeedback.sessionExpired.description"),
      title: i18n.t("requestFeedback.sessionExpired.title"),
      variant: "info",
    });

    window.location.assign(environment.appBasePath);
    return;
  }

  if (error instanceof ApiRequestError && error.status === undefined) {
    enqueueRequestFeedback({
      description: i18n.t("requestFeedback.network.description"),
      title: i18n.t("requestFeedback.network.title"),
      variant: "error",
    });
    return;
  }

  if (error instanceof Error) {
    enqueueRequestFeedback({
      description: getUserFacingErrorMessage(error),
      title: i18n.t("requestFeedback.generic.title"),
      variant: "error",
    });
    return;
  }

  enqueueRequestFeedback({
    description: getUserFacingErrorMessage(error),
    title: i18n.t("requestFeedback.generic.title"),
    variant: "error",
  });
  console.error(error);
};

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: reportRequestError,
  }),
  queryCache: new QueryCache({
    onError: reportRequestError,
  }),
  defaultOptions: {
    mutations: {
      retry: false,
    },
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
