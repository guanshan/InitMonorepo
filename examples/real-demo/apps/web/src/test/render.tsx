import type { PropsWithChildren, ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

interface RenderWithProvidersOptions {
  route?: string;
}

export const renderWithProviders = (
  ui: ReactElement,
  { route = "/" }: RenderWithProvidersOptions = {},
): ReturnType<typeof render> & { queryClient: QueryClient } => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );

  const rendered = render(ui, {
    wrapper: Wrapper,
  });

  return {
    queryClient,
    ...rendered,
  };
};
