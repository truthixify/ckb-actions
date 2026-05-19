import { InvalidParamsError } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/core';
import { Router } from 'express';
import { handleTipJarSubmit } from './handler.js';
import { buildTipJarManifest } from './manifest.js';

export { handleTipJarSubmit } from './handler.js';
export { buildTipJarManifest } from './manifest.js';

const X_CKB_ACTION_HEADER = 'X-CKB-Action';

async function validateRecipient(value: unknown): Promise<string> {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidParamsError('recipient query parameter is required');
  }
  try {
    await ccc.Address.fromString(value, new ccc.ClientPublicTestnet());
  } catch (cause) {
    throw new InvalidParamsError(`recipient "${value}" is not a valid CKB testnet address`, {
      cause,
    });
  }
  return value;
}

/**
 * Build the Express Router serving the tip jar. The recipient is supplied
 * per request via the `recipient` query parameter so a single endpoint
 * deployment can serve every publisher who knows their own CKB address.
 *
 * @spec §11.1
 */
export function buildTipJarRouter(baseUrl: string): Router {
  const router: Router = Router();

  router.get('/', (req, res, next) => {
    void validateRecipient(req.query.recipient)
      .then((recipient) => {
        res.setHeader(X_CKB_ACTION_HEADER, 'true');
        res.json(buildTipJarManifest(baseUrl, recipient));
      })
      .catch(next);
  });

  router.post('/submit', (req, res, next) => {
    handleTipJarSubmit(req, res).catch(next);
  });

  return router;
}
