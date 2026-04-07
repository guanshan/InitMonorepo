import {
  getGetUserByIdQueryKey,
  getListUsersQueryKey,
  useCreateUser as useCreateUserGenerated,
  useGetUserById as useGetUserByIdGenerated,
  useListUsers as useListUsersGenerated,
} from "@real-demo/sdk/react";
import {
  CreateUserResponseSchema,
  UserDetailResponseSchema,
  UserListResponseSchema,
} from "@real-demo/shared";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { startTransition } from "react";
import { useNavigate } from "react-router-dom";

import { environment } from "../../shared/config/env";
import {
  type CreateUserDraft,
  mapCreateUserDraftToDto,
  mapUserToDetailModel,
  mapUserToListItem,
  type UserDetailModel,
  type UserListItem,
} from "./model";

/**
 * Thin wrappers around the Orval-generated hooks.
 * These add Zod runtime validation and domain-specific side-effects
 * (cache invalidation, navigation) without re-implementing the transport layer.
 */

const sdkRequest = {
  baseUrl: environment.apiBaseUrl,
};

export const useUsers = (): UseQueryResult<UserListItem[], unknown> =>
  useListUsersGenerated({
    query: {
      select: (response) =>
        UserListResponseSchema.parse(response.data).data.map(mapUserToListItem),
    },
    request: sdkRequest,
  });

export const useUserById = (
  userId: string,
): UseQueryResult<UserDetailModel, unknown> =>
  useGetUserByIdGenerated(userId, {
    query: {
      enabled: userId.length > 0,
      select: (response) =>
        mapUserToDetailModel(UserDetailResponseSchema.parse(response.data).data),
    },
    request: sdkRequest,
  });

export const useCreateUser = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useCreateUserGenerated({
    mutation: {
      onSuccess: async (response) => {
        const user = CreateUserResponseSchema.parse(response.data).data;
        await queryClient.invalidateQueries({
          queryKey: getListUsersQueryKey(),
        });
        startTransition(() => {
          navigate(`/users/${user.id}`);
        });
      },
    },
    request: sdkRequest,
  });

  return {
    error: mutation.error as Error | null,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    mutate: (input: CreateUserDraft) =>
      mutation.mutate({ data: mapCreateUserDraftToDto(input) }),
    mutateAsync: (input: CreateUserDraft) =>
      mutation.mutateAsync({ data: mapCreateUserDraftToDto(input) }),
  };
};

export { getGetUserByIdQueryKey, getListUsersQueryKey };
