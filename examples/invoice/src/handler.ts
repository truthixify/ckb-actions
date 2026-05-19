import {
  actionRequestSchema,
  ExpiredError,
  InvalidAddressError,
  InvalidParamsError,
  type ActionResponse,
} from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/core';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { INVOICE_RECIPIENT_LOCK } from './config.js';
import type { InvoiceStore } from './store.js';

const SHANNONS_PER_CKB = 100_000_000n;
const MIN_INVOICE_CKB = 61;
const MAX_INVOICE_CKB = 100_000_000;
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

const callbackBodySchema = z.object({
  txHash: z.string().regex(TX_HASH_PATTERN, 'txHash must be a 32-byte hex string'),
});

function requireInvoiceId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidParamsError('invoice id missing or invalid');
  }
  return value;
}

/**
 * Build the POST /:id/submit handler. Reads the invoice by id, verifies it
 * has not already been paid (per §6.3 EXPIRED), validates the consumer
 * address, and emits an OTX paying the invoice amount to the merchant.
 *
 * @spec §6.2, §11.3
 */
export function buildInvoiceSubmitHandler(store: InvoiceStore, baseUrl: string) {
  return async function handleInvoiceSubmit(req: Request, res: Response): Promise<void> {
    const id = requireInvoiceId(req.params.id);
    const invoice = store.get(id);
    if (!invoice) throw new InvalidParamsError(`invoice "${id}" not found`);
    if (invoice.paidAt) throw new ExpiredError(`invoice "${id}" has already been paid`);
    if (invoice.amount < MIN_INVOICE_CKB || invoice.amount > MAX_INVOICE_CKB) {
      throw new InvalidParamsError(
        `invoice amount must be between ${MIN_INVOICE_CKB} and ${MAX_INVOICE_CKB} CKB`,
      );
    }

    const bodyResult = actionRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new InvalidParamsError(`malformed request body: ${bodyResult.error.message}`);
    }
    const { address } = bodyResult.data;

    try {
      await ccc.Address.fromString(address, new ccc.ClientPublicTestnet());
    } catch (cause) {
      throw new InvalidAddressError(`"${address}" is not a valid CKB testnet address`, { cause });
    }

    const amountShannons = BigInt(invoice.amount) * SHANNONS_PER_CKB;
    const tx = ccc.Transaction.from({
      outputs: [{ lock: INVOICE_RECIPIENT_LOCK, capacity: amountShannons }],
      outputsData: ['0x'],
    });

    const response: ActionResponse = {
      type: 'transaction',
      encoding: 'molecule',
      otx: ccc.hexFrom(tx.toBytes()),
      message: `Pay "${invoice.description}" — ${invoice.amount} CKB`,
      callback: `${baseUrl}/${invoice.id}/callback`,
    };
    res.json(response);
  };
}

/**
 * Build the POST /:id/callback handler. Clients call this after the wallet
 * submits the signed transaction so the merchant can mark the invoice paid
 * and correlate the on-chain tx with the off-chain invoice id.
 *
 * @spec §11.3
 */
export function buildInvoiceCallbackHandler(store: InvoiceStore) {
  return function handleInvoiceCallback(req: Request, res: Response): void {
    const id = requireInvoiceId(req.params.id);
    const invoice = store.get(id);
    if (!invoice) throw new InvalidParamsError(`invoice "${id}" not found`);

    const bodyResult = callbackBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new InvalidParamsError(`malformed callback body: ${bodyResult.error.message}`);
    }

    store.markPaid(id, bodyResult.data.txHash);
    res.json({ ok: true });
  };
}
