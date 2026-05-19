import { Router } from 'express';
import { buildInvoiceCallbackHandler, buildInvoiceSubmitHandler } from './handler.js';
import { buildInvoiceManifest } from './manifest.js';
import { createInvoiceStore, type InvoiceStore } from './store.js';

export { INVOICE_RECIPIENT_LOCK } from './config.js';
export { buildInvoiceCallbackHandler, buildInvoiceSubmitHandler } from './handler.js';
export { buildInvoiceManifest } from './manifest.js';
export { createInvoiceStore, type Invoice, type InvoiceStore, type NewInvoice } from './store.js';

const X_CKB_ACTION_HEADER = 'X-CKB-Action';

export interface InvoiceRouterOptions {
  baseUrl: string;
  store?: InvoiceStore;
  /** Seed the store with a fixed-id "demo" invoice so the example is runnable out of the box. */
  seedDemo?: boolean;
}

/**
 * Build the Express Router serving the invoice action. Routes:
 *
 *   GET  /:id            → §6.1 manifest for this invoice
 *   POST /:id/submit     → §6.2 OTX
 *   POST /:id/callback   → §11.3 mark-paid hook
 *
 * @spec §11.3
 */
export function buildInvoiceRouter({
  baseUrl,
  store = createInvoiceStore(),
  seedDemo = true,
}: InvoiceRouterOptions): { router: Router; store: InvoiceStore } {
  if (seedDemo) {
    store.create({ id: 'demo', amount: 100, description: 'Demo invoice' });
  }

  const router: Router = Router();

  router.get('/:id', (req, res, next) => {
    try {
      const invoice = store.get(req.params.id ?? '');
      if (!invoice) {
        res.status(404).json({ error: 'INVALID_PARAMS', message: `invoice not found` });
        return;
      }
      res.setHeader(X_CKB_ACTION_HEADER, 'true');
      res.json(buildInvoiceManifest(baseUrl, invoice));
    } catch (err) {
      next(err);
    }
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
