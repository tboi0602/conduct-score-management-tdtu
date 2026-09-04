import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Bọc handler async: mọi lỗi ném ra trong controller/service sẽ được
 * chuyển cho error middleware xử lý, thay vì try/catch lặp lại ở từng
 * handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
