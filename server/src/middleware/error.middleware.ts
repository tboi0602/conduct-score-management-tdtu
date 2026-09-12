import type { Request, Response, NextFunction } from "express";
import { logger } from "@config/logger";

/**
 * Error middleware trung tâm - luôn mount CUỐI cùng trong index.ts.
 * Service chỉ ném lỗi, controller không cần try/catch:
 *   - ApiError  -> trả đúng status + message
 *   - lỗi khác  -> trả 500 (không lộ chi tiết nội bộ ra ngoài)
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const status = (err as Error & { status?: number }).status ?? 500;

  if (status >= 500) {
    logger.error(`[api] unhandled error: ${err.message}`);
  }

  res.status(status).json({
    error: status >= 500 ? "Internal Server Error" : err.message,
  });
}
