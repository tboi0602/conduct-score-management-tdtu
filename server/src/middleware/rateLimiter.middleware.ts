import type { NextFunction, Request, Response } from "express";

import { redisClient } from "@redis";
import { attendanceRateLimitRejectionsTotal } from "@metrics";
import { ApiError } from "@utils/ApiError";
import { env } from "@config/env";

export function rateLimit(prefix: string, max: number, windowSec: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      redisClient.getClient();
      const key = `${prefix}:${req.ip}`;
      const result = await redisClient.rateLimit(key, max, windowSec);

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      if (!result.allowed) {
        if (prefix.startsWith("attendance:")) attendanceRateLimitRejectionsTotal.inc();
        res.setHeader("Retry-After", result.retryAfterSec);
        return next(new ApiError(429, "Too many requests; please try again later"));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function rateLimitAuthenticatedUser(prefix: string, max: number, windowSec: number) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (res.locals.auth as { sub?: string } | undefined)?.sub;
      if (!userId) return next(new ApiError(401, "Authentication required"));
      const result = await redisClient.rateLimit(`${prefix}:${userId}`, max, windowSec);
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
  env.redisRateLimitMax,
  env.redisRateLimitWindow,
);

export const eventRegistrationRateLimit = rateLimitAuthenticatedUser(
  "event-registration:user",
  env.eventRegistrationRateLimitMax,
  env.eventRegistrationRateLimitWindow,
);
