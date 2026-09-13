import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types/admin";

type Entity = { id: string };

function isEntity(value: unknown): value is Entity {
  return (
    typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
  );
}

function isPaginatedResponse<T extends Entity>(value: unknown): value is PaginatedResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray(value.data) &&
    "pagination" in value &&
    typeof value.pagination === "object" &&
    value.pagination !== null
  );
}

export function updateCachedEntity<T extends Entity>(
  client: QueryClient,
  queryKey: QueryKey,
  entity: T,
) {
  client.setQueriesData<unknown>({ queryKey }, (cached: unknown) => {
    if (isPaginatedResponse<T>(cached)) {
      return {
        ...cached,
        data: cached.data.map((item) => (item.id === entity.id ? entity : item)),
      };
    }
    if (isEntity(cached) && cached.id === entity.id) return entity;
    return cached;
  });
}

export function prependCachedEntity<T extends Entity>(
  client: QueryClient,
  queryKey: QueryKey,
  entity: T,
) {
  client.setQueriesData<unknown>({ queryKey }, (cached: unknown) => {
    if (!isPaginatedResponse<T>(cached)) return cached;
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
  client.setQueriesData<unknown>({ queryKey }, (cached: unknown) => {
    if (!isPaginatedResponse<Entity>(cached) || !cached.data.some((item) => item.id === id)) {
      return cached;
    }
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
