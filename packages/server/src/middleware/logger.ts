import type { NextFunction, Request, Response } from 'express';
import type { Logger } from '../logger.js';

declare global {
  namespace Express {
    interface Request {
      /** Request-scoped child logger, bound with the request id. */
      log: Logger;
    }
  }
}

/**
 * Attach a request-scoped child logger and emit a single completion entry
 * per request, including method, path, status, and elapsed time.
 */
export function requestLoggerMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.log = logger.child({ requestId: req.id });
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      req.log.info('request completed', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
      });
    });

    next();
  };
}
