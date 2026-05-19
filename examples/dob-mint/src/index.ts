import { Router } from 'express';
import { handleDobMintSubmit } from './handler.js';
import { buildDobMintManifest } from './manifest.js';

export {
  CLUSTER_ID,
  CLUSTER_TYPE,
  CLUSTER_TYPE_CODE_HASH,
  SPORE_TYPE_CODE_HASH,
} from './config.js';
export { handleDobMintSubmit } from './handler.js';
export { buildDobMintManifest } from './manifest.js';

const X_CKB_ACTION_HEADER = 'X-CKB-Action';

/**
 * Build the Express Router serving the DOB mint manifest at `GET /` and the
 * submit handler at `POST /submit`. Caller mounts under the same path as
 * `baseUrl` so the manifest's hrefs resolve correctly.
 *
 * @spec §11.2
 */
export function buildDobMintRouter(baseUrl: string): Router {
  const manifest = buildDobMintManifest(baseUrl);
  const router: Router = Router();

  router.get('/', (_req, res) => {
    res.setHeader(X_CKB_ACTION_HEADER, 'true');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(manifest);
  });

  router.post('/submit', (req, res, next) => {
    handleDobMintSubmit(req, res).catch(next);
  });

  return router;
}
