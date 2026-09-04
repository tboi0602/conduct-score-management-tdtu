"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { HttpError } from "@/services/http";
import type { PaginatedResponse, PaginationMeta } from "@/types/admin";

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export function usePaginatedData<T>(
  baseQueryKey: readonly unknown[],
  fetcher: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  limit = 20,
) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [...baseQueryKey, page, limit],
    queryFn: () => fetcher(page, limit),
    placeholderData: keepPreviousData,
  });

  if (
    query.error instanceof HttpError &&
    query.error.status === 401 &&
    typeof window !== "undefined"
  ) {
    window.location.href = "/admin";
  }

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: baseQueryKey }),
    [baseQueryKey, queryClient],
  );

  return {
    error: query.error instanceof Error ? query.error.message : null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    items: query.data?.data ?? [],
    page,
    pagination: query.data?.pagination ?? { ...emptyPagination, page, limit },
    reload,
    setPage,
  };
}
