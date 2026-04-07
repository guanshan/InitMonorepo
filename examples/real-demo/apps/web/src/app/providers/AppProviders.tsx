import type { PropsWithChildren } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "../../shared/api/query-client";
import { RequestFeedbackToaster } from "../../shared/ui/RequestFeedbackToaster";
import { ThemeEffect } from "../../shared/ui/ThemeEffect";

export const AppProviders = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>
    <ThemeEffect />
    {children}
    <RequestFeedbackToaster />
  </QueryClientProvider>
);
