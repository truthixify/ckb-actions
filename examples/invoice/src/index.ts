import { Router } from 'express';
import {
  buildCreateInvoiceHandler,
  buildInvoiceCallbackHandler,
  buildInvoiceSubmitHandler,
} from './handler.js';
import { buildInvoiceManifest } from './manifest.js';
import { createInvoiceStore, type InvoiceStore } from './store.js';

export {
  buildCreateInvoiceHandler,
  buildInvoiceCallbackHandler,
  buildInvoiceSubmitHandler,
  createInvoiceBodySchema,
  type CreateInvoiceBody,
} from './handler.js';
export { buildInvoiceManifest } from './manifest.js';
export { createInvoiceStore, type Invoice, type InvoiceStore, type NewInvoice } from './store.js';

const X_CKB_ACTION_HEADER = 'X-CKB-Action';

export interface InvoiceRouterOptions {
  baseUrl: string;
  store?: InvoiceStore;
}

export interface InvoiceRouterHandle {
  router: Router;
  store: InvoiceStore;
}

/**
 * Build the Express Router for the invoice action. Routes:
 *
 *   POST /create         → create a new invoice, returns the manifest URL
 *   GET  /:id            → §6.1 manifest for this invoice
 *   POST /:id/submit     → §6.2 OTX
 *   POST /:id/callback   → §11.3 mark-paid hook
 *
 * @spec §11.3
 */
export function buildInvoiceRouter({
  baseUrl,
  store = createInvoiceStore(),
}: InvoiceRouterOptions): InvoiceRouterHandle {
  const router: Router = Router();

  const createHandler = buildCreateInvoiceHandler(store, baseUrl);
  router.post('/create', (req, res, next) => {
    createHandler(req, res).catch(next);
  });

  router.get('/:id', (req, res) => {
    const invoice = store.get(req.params.id ?? '');
    if (!invoice) {
      res.status(404).json({ error: 'INVALID_PARAMS', message: `invoice not found` });
      return;
    }
    res.setHeader(X_CKB_ACTION_HEADER, 'true');
    res.json(buildInvoiceManifest(baseUrl, invoice));
  });

  const submitHandler = buildInvoiceSubmitHandler(store, baseUrl);
  router.post('/:id/submit', (req, res, next) => {
    submitHandler(req, res).catch(next);
  });

  const callbackHandler = buildInvoiceCallbackHandler(store);
  router.post('/:id/callback', (req, res, next) => {
    try {
      callbackHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  return { router, store };
}
