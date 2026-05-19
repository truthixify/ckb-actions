import { buildInvoiceRouter } from '@ckb-actions/example-invoice';
import { buildTipJarRouter } from '@ckb-actions/example-tip-jar';
import cors from 'cors';
import express, { type Express } from 'express';
import type { Config } from './config.js';
import type { Logger } from './logger.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import { requestLoggerMiddleware } from './middleware/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { healthRouter } from './routes/health.js';

const TIP_JAR_MOUNT = '/actions/tip-jar';
const INVOICE_MOUNT = '/actions/invoice';

const JSON_BODY_LIMIT = '64kb';

export interface AppDeps {
  config: Config;
  logger: Logger;
}

/**
 * Build the Express application. Pure factory: takes a resolved config and
 * logger, returns a configured Express instance. The entry point binds it
 * to a port; tests run supertest against the bare app.
 *
 * Middleware order is fixed: request id → request logger → CORS → JSON
 * parser → routes → error handler (last). The error handler relies on a
 * request-scoped logger attached by the request logger middleware.
 */
export function createApp({ config, logger }: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware(logger));
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(healthRouter);
  app.use(TIP_JAR_MOUNT, buildTipJarRouter(TIP_JAR_MOUNT));
  app.use(INVOICE_MOUNT, buildInvoiceRouter({ baseUrl: INVOICE_MOUNT }).router);

  app.use(errorHandlerMiddleware(logger));

  return app;
}
