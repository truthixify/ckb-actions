import { Router } from 'express';

/** Liveness probe. Returns 200 with a fixed body when the process is up. */
export const healthRouter: Router = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
