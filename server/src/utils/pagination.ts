import type { Request } from "express";

import { ApiError } from "@utils/ApiError";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function parsePositiveInteger(value: unknown, fallback: number, field: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, `${field} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `${field} must be a positive integer`);
  }
  return parsed;
}

export function parsePagination(query: Request["query"]): PaginationParams {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, "page");
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, "limit");

  if (limit > MAX_LIMIT) {
    throw new ApiError(400, `limit cannot exceed ${MAX_LIMIT}`);
  }

  return { page, limit, skip: (page - 1) * limit };
}

export function createPaginationMeta(
  total: number,
  { page, limit }: PaginationParams,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
