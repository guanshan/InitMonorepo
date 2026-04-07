import { ApiRequestError } from "@real-demo/sdk/types";

import { i18n } from "./i18n";

const statusTranslationKeys = {
  400: "errors.bad_request",
  404: "errors.route_not_found",
  409: "errors.conflict",
  500: "errors.internal_server_error",
} as const;

export const getUserFacingErrorMessage = (
  error: unknown,
  fallbackKey = "errors.generic",
) => {
  if (error instanceof ApiRequestError) {
    if (error.status === undefined) {
      return i18n.t("errors.network");
    }

    if (error.code) {
      const codeTranslationKey = `errors.${error.code}`;

      if (i18n.exists(codeTranslationKey)) {
        return i18n.t(codeTranslationKey);
      }
    }

    return i18n.t(
      statusTranslationKeys[error.status as keyof typeof statusTranslationKeys] ??
        fallbackKey,
    );
  }

  return i18n.t(fallbackKey);
};
