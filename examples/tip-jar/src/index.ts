import { Router } from 'express';
import { handleTipJarSubmit } from './handler.js';
import { buildTipJarManifest } from './manifest.js';

export { TIP_JAR_RECIPIENT_LOCK } from './config.js';
export { handleTipJarSubmit } from './handler.js';
export { buildTipJarManifest } from './manifest.js';

const X_CKB_ACTION_HEADER = 'X-CKB-Action';

/**
 * Build the Express Router that serves the tip jar manifest at `GET /` and
 * the submit handler at `POST /submit`. The caller mounts this router under
 * the same path as `baseUrl` so the manifest's hrefs resolve correctly.
 *
 * @spec §11.1
 */
export function buildTipJarRouter(baseUrl: string): Router {
  const manifest = buildTipJarManifest(baseUrl);
  const router: Router = Router();

  router.get('/', (_req, res) => {
    res.setHeader(X_CKB_ACTION_HEADER, 'true');
    res.json(manifest);
  });

  router.post('/submit', (req, res, next) => {
    handleTipJarSubmit(req, res).catch(next);
  });

  return router;
}
