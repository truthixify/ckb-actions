import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

declare global {
  namespace Express {
    interface Request {
      /** Stable id for this request. Echoed back in the X-Request-Id response header. */
      id: string;
    }
  }
}

/**
 * Attach a stable request id to each request. Honors an inbound
 * `X-Request-Id` header if present; otherwise generates a UUID. Echoes the
 * resolved id back on the response so the caller can correlate.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  req.id = incoming && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
}
