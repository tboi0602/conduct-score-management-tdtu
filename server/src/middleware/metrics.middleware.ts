import type { Request, Response, NextFunction } from "express";
import { httpRequestsTotal, httpRequestDuration } from "@metrics";

/**
 * Đo lường Prometheus cho mọi request. Label route dùng template của
 * Express (vd: /api/v1/events/:id) thay vì path thật để tránh sinh ra
 * vô hạn label từ các path chứa id.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const endTimer = httpRequestDuration.startTimer({
    method: req.method,
    route: "unmatched",
  });

  res.on("finish", () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : req.baseUrl || req.path;
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
