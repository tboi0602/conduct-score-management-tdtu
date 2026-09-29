import type { NextFunction, Request, Response } from "express";
import { z, type ZodTypeAny } from "zod";

import { ApiError, type ApiErrorFields } from "@utils/ApiError";

type RequestSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export type ValidatedRequest = Partial<Record<keyof RequestSchemas, unknown>>;

function fieldsFor(error: z.ZodError): ApiErrorFields {
  const fields: ApiErrorFields = {};
  for (const issue of error.issues) {
    const name = issue.path.join(".") || "request";
    (fields[name] ??= []).push(issue.message);
  }
  return fields;
}

export function validate(schemas: RequestSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validated: ValidatedRequest = {};
    for (const key of ["body", "params", "query"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        next(
          new ApiError(
            400,
            "Request validation failed",
            "VALIDATION_ERROR",
            fieldsFor(result.error),
          ),
        );
        return;
      }
      validated[key] = result.data;
    }
    res.locals.validated = validated;
    next();
  };
}

export function validated<T>(res: Response, key: keyof RequestSchemas): T {
  return (res.locals.validated as ValidatedRequest | undefined)?.[key] as T;
}
