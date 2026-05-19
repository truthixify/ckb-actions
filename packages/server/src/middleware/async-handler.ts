import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wrap an async route handler so a rejected promise is forwarded to the
 * centralized error middleware. Express 5 catches async rejections natively,
 * but this wrapper documents the intent at each call site and keeps handler
 * signatures uniform.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
