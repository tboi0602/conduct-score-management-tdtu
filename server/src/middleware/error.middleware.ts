import type { Request, Response, NextFunction } from "express";
import { logger } from "@config/logger";
import { ApiError } from "@utils/ApiError";

/**
 * Error middleware trung tâm - luôn mount CUỐI cùng trong index.ts.
 * Service chỉ ném lỗi, controller không cần try/catch:
 *   - ApiError  -> trả đúng status + message
 *   - lỗi khác  -> trả 500 (không lộ chi tiết nội bộ ra ngoài)
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const apiError = err instanceof ApiError ? err : null;
  const status = apiError?.status ?? 500;
  const requestId = String(res.locals.requestId ?? req.header("x-request-id") ?? "unknown");
  const message = status >= 500 ? "Internal Server Error" : err.message;
  const code = apiError?.code ?? "INTERNAL_ERROR";

  if (status >= 500) {
    logger.error("[api] unhandled error", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      errorName: err.name,
      errorMessage: err.message,
    });
  }

  res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      ...(apiError?.fields ? { fields: apiError.fields } : {}),
    },
    requestId,
  });
}
