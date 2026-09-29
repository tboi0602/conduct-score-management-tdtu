import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const supplied = req.header(REQUEST_ID_HEADER)?.trim();
  const requestId = supplied && supplied.length <= 128 ? supplied : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}
