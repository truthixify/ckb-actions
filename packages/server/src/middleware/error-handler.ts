import { isWireErrorCode, SdkError, toErrorResponse, type ErrorCode } from '@ckb-actions/sdk';
import type { ErrorRequestHandler } from 'express';
import type { Logger } from '../logger.js';

const STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  INVALID_ADDRESS: 400,
  INSUFFICIENT_CAPACITY: 400,
  INVALID_PARAMS: 400,
  UNSUPPORTED_NETWORK: 400,
  EXPIRED: 410,
  INTERNAL: 500,
};

/**
 * Centralized error handler. SDK errors with normative §6.3 tags are mapped
 * to a deterministic HTTP status and serialized per §6.3. Everything else —
 * SDK-internal failures, raw exceptions — is masked as 500 INTERNAL with
 * the original cause logged so consumers see consistent wire shapes.
 *
 * @spec §6.3
 */
export function errorHandlerMiddleware(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const reqLog = req.log ?? logger;

    if (err instanceof SdkError && isWireErrorCode(err.tag)) {
      const status = STATUS_BY_ERROR_CODE[err.tag];
      reqLog.warn('action endpoint returned wire error', {
        tag: err.tag,
        status,
        message: err.message,
      });
      res.status(status).json(toErrorResponse(err));
      return;
    }

    reqLog.error('unhandled error', {
      name: err instanceof Error ? err.name : 'unknown',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
  };
}
