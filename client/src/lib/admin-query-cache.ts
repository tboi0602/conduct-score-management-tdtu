import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types/admin";

type Entity = { id: string };

export function updateCachedEntity<T extends Entity>(
  client: QueryClient,
  queryKey: QueryKey,
  entity: T,
) {
  client.setQueriesData<PaginatedResponse<T>>({ queryKey }, (cached) =>
    cached
      ? {
          ...cached,
          data: cached.data.map((item) => (item.id === entity.id ? entity : item)),
        }
      : cached,
  );
}

export function prependCachedEntity<T extends Entity>(
  client: QueryClient,
  queryKey: QueryKey,
  entity: T,
) {
  client.setQueriesData<PaginatedResponse<T>>({ queryKey }, (cached) => {
    if (!cached) return cached;
    const pagination = { ...cached.pagination, total: cached.pagination.total + 1 };
    pagination.totalPages = Math.ceil(pagination.total / pagination.limit);
    pagination.hasNextPage = pagination.page < pagination.totalPages;
    return {
      ...cached,
      pagination,
      data:
        pagination.page === 1 ? [entity, ...cached.data].slice(0, pagination.limit) : cached.data,
    };
  });
}

export function removeCachedEntity(client: QueryClient, queryKey: QueryKey, id: string) {
  client.setQueriesData<PaginatedResponse<Entity>>({ queryKey }, (cached) => {
    if (!cached || !cached.data.some((item) => item.id === id)) return cached;
    const total = Math.max(cached.pagination.total - 1, 0);
    const totalPages = Math.ceil(total / cached.pagination.limit);
    return {
      ...cached,
      data: cached.data.filter((item) => item.id !== id),
      pagination: {
        ...cached.pagination,
        total,
        totalPages,
        hasNextPage: cached.pagination.page < totalPages,
      },
    };
  });
}
