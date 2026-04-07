import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { environment } from "../../shared/config/env";
import { useCreateUser, useUserById, useUsers } from "./api";

const sdkReactMocks = vi.hoisted(() => ({
  getGetUserByIdQueryKey: vi.fn((id: string) => [`/api/users/${id}`]),
  getListUsersQueryKey: vi.fn(() => ["/api/users"]),
  useCreateUserGenerated: vi.fn(),
  useGetUserByIdGenerated: vi.fn(),
  useListUsersGenerated: vi.fn(),
}));

vi.mock("@real-demo/sdk/react", () => ({
  getGetUserByIdQueryKey: sdkReactMocks.getGetUserByIdQueryKey,
  getListUsersQueryKey: sdkReactMocks.getListUsersQueryKey,
  useCreateUser: sdkReactMocks.useCreateUserGenerated,
  useGetUserById: sdkReactMocks.useGetUserByIdGenerated,
  useListUsers: sdkReactMocks.useListUsersGenerated,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: PropsWithChildren) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe("user api wrappers", () => {
  beforeEach(() => {
    sdkReactMocks.useCreateUserGenerated.mockReset();
    sdkReactMocks.useGetUserByIdGenerated.mockReset();
    sdkReactMocks.useListUsersGenerated.mockReset();

    sdkReactMocks.useCreateUserGenerated.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    });
    sdkReactMocks.useGetUserByIdGenerated.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
    });
    sdkReactMocks.useListUsersGenerated.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isPending: false,
    });
  });

  it("passes runtime apiBaseUrl to the list users query hook", () => {
    renderHook(() => useUsers());

    expect(sdkReactMocks.useListUsersGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        request: {
          baseUrl: environment.apiBaseUrl,
        },
      }),
    );
  });

  it("passes runtime apiBaseUrl to the user detail query hook", () => {
    renderHook(() => useUserById("user_1"));

    expect(sdkReactMocks.useGetUserByIdGenerated).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        request: {
          baseUrl: environment.apiBaseUrl,
        },
      }),
    );
  });

  it("passes runtime apiBaseUrl to the create user mutation hook", () => {
    renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    expect(sdkReactMocks.useCreateUserGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        request: {
          baseUrl: environment.apiBaseUrl,
        },
      }),
    );
  });
});
