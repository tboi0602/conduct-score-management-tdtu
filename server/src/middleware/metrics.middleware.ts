import type { Request, Response, NextFunction } from "express";
import { httpRequestsTotal, httpRequestDuration } from "../metrics";

/**
 * Prometheus instrumentation for every request. Route label uses the
 * Express route template (e.g. /api/v1/events/:id) to avoid unbounded
 * cardinality from raw paths containing ids.
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const endTimer = httpRequestDuration.startTimer({
    method: req.method,
    route: "unmatched",
  });

  res.on("finish", () => {
    const route = req.route
      ? `${req.baseUrl}${req.route.path}`
      : req.baseUrl || req.path;
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });

  next();
}
