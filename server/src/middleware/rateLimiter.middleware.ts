import type { NextFunction, Request, Response } from "express";

import { redisClient } from "@redis";
import { ApiError } from "@utils/ApiError";

export function rateLimit(prefix: string, max: number, windowSec: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      redisClient.getClient();
      const key = `${prefix}:${req.ip}`;
      const result = await redisClient.rateLimit(key, max, windowSec);

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfterSec);
        return next(new ApiError(429, "Too many requests; please try again later"));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const rateLimitByStudent = rateLimit(
  "attendance:student",
  Number(process.env.REDIS_RATE_LIMIT_MAX ?? 10),
  Number(process.env.REDIS_RATE_LIMIT_WINDOW ?? 10),
);
