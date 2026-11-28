"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { HttpError } from "@/services/http";
import type { PaginatedResponse, PaginationMeta } from "@/types/admin";

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export function usePaginatedData<T>(
  baseQueryKey: readonly unknown[],
  fetcher: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  limit = 50,
  options: { refetchOnMount?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const [page, setPageState] = useState(() => {
    if (typeof window === "undefined") return 1;
    const raw = Number(new URLSearchParams(window.location.search).get("page"));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });
  const setPage = useCallback((nextPage: number) => {
    const safePage = Math.max(1, Math.floor(nextPage));
    setPageState(safePage);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (safePage <= 1) url.searchParams.delete("page");
      else url.searchParams.set("page", String(safePage));
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);
  const baseKeyString = JSON.stringify(baseQueryKey);
  const prevBaseKeyRef = useRef(baseKeyString);
  useEffect(() => {
    if (prevBaseKeyRef.current !== baseKeyString) {
      prevBaseKeyRef.current = baseKeyString;
      if (page !== 1) setPage(1);
    }
  }, [baseKeyString, page, setPage]);

  const query = useQuery({
    queryKey: [...baseQueryKey, page, limit],
    queryFn: () => fetcher(page, limit),
    placeholderData: keepPreviousData,
    ...options,
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
    requestError: query.error,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    items: query.data?.data ?? [],
    page,
    pagination: query.data?.pagination ?? { ...emptyPagination, page, limit },
    reload,
    setPage,
  };
}
