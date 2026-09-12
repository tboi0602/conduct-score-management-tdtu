import { ApiError } from "@utils/ApiError";

export function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

export function textInput(value: unknown, field: string, max = 255): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, `${field} must contain 1 to ${max} characters`);
  }
  return value.trim();
}

export function uuidInput(value: unknown, field = "id"): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ApiError(400, `${field} must be a UUID`);
  }
  return value;
}

export function integerInput(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2147483647) {
    throw new ApiError(400, `${field} must be a non-negative 32-bit integer`);
  }
  return value;
}

export function dateInput(value: unknown, field: string): Date {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    throw new ApiError(400, `${field} must be an ISO datetime with timezone`);
  }
  const date = new Date(value);
  const day = Number(value.slice(8, 10));
  const daysInMonth = new Date(
    Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)), 0),
  ).getUTCDate();
  if (
    !Number.isFinite(date.getTime()) ||
    day < 1 ||
    day > daysInMonth ||
    Number(value.slice(11, 13)) > 23
  ) {
    throw new ApiError(400, `${field} is not a valid datetime`);
  }
  return date;
}

export function enumInput<T extends string>(
  value: unknown,
  values: readonly T[],
  field: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new ApiError(400, `${field} must be one of: ${values.join(", ")}`);
  }
  return value as T;
}

export function optionalQuery<T>(value: unknown, parse: (value: unknown) => T): T | undefined {
  return value === undefined ? undefined : parse(value);
}

export function searchInput(value: unknown): string {
  const search = textInput(value, "search", 100);
  if (search.length < 3) throw new ApiError(400, "search must contain at least 3 characters");
  // Escape LIKE wildcards so search means a literal substring.
  return search.replace(/[\\%_]/g, "\\$&");
}

export function integerQuery(value: unknown, field: string): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, `${field} must be a non-negative integer`);
  }
  return integerInput(Number(value), field);
}
