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
import type { Invoice, InvoiceStore } from './store.js';

const SHANNONS_PER_CKB = 100_000_000n;
const MIN_INVOICE_CKB = 61;
const MAX_INVOICE_CKB = 100_000_000;
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

const callbackBodySchema = z.object({
  txHash: z.string().regex(TX_HASH_PATTERN, 'txHash must be a 32-byte hex string'),
});

export const createInvoiceBodySchema = z.object({
  amount: z.number().int().min(MIN_INVOICE_CKB).max(MAX_INVOICE_CKB),
  description: z.string().min(1).max(200),
  recipient: z.string().min(1),
});

export type CreateInvoiceBody = z.infer<typeof createInvoiceBodySchema>;

function requireInvoiceId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidParamsError('invoice id missing or invalid');
  }
  return value;
}

async function resolveRecipientLock(invoice: Invoice): Promise<ccc.Script> {
  try {
    const parsed = await ccc.Address.fromString(invoice.recipient, new ccc.ClientPublicTestnet());
    return parsed.script;
  } catch (cause) {
    throw new InvalidParamsError(
      `Stored recipient "${invoice.recipient}" is no longer a valid CKB testnet address`,
      { cause },
    );
  }
}

/**
 * Build the POST /:id/submit handler. Reads the invoice, verifies it hasn't
 * been paid (per §6.3 EXPIRED), validates the consumer address, and emits
 * an OTX paying the invoice amount to the recipient lock stored on the
 * invoice.
 *
 * @spec §6.2, §11.3
 */
export function buildInvoiceSubmitHandler(store: InvoiceStore, baseUrl: string) {
  return async function handleInvoiceSubmit(req: Request, res: Response): Promise<void> {
    const id = requireInvoiceId(req.params.id);
    const invoice = store.get(id);
    if (!invoice) throw new InvalidParamsError(`invoice "${id}" not found`);
    if (invoice.paidAt) throw new ExpiredError(`invoice "${id}" has already been paid`);

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

    const lock = await resolveRecipientLock(invoice);
    const amountShannons = BigInt(invoice.amount) * SHANNONS_PER_CKB;
    const tx = ccc.Transaction.from({
      outputs: [{ lock, capacity: amountShannons }],
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
 * Build the POST /:id/callback handler. Marks the invoice paid and records
 * the on-chain tx hash supplied by the client after wallet submission.
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

/**
 * Build the POST /create handler. Anyone can mint a new invoice for a CKB
 * recipient they control — the response carries the manifest URL the
 * publisher then shares with the payer.
 *
 * @spec §11.3
 */
export function buildCreateInvoiceHandler(store: InvoiceStore, baseUrl: string) {
  return async function handleCreateInvoice(req: Request, res: Response): Promise<void> {
    const bodyResult = createInvoiceBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new InvalidParamsError(`malformed create body: ${bodyResult.error.message}`);
    }
    const { amount, description, recipient } = bodyResult.data;

    try {
      await ccc.Address.fromString(recipient, new ccc.ClientPublicTestnet());
    } catch (cause) {
      throw new InvalidParamsError(`recipient "${recipient}" is not a valid CKB testnet address`, {
        cause,
      });
    }

    const invoice = store.create({ amount, description, recipient });
    res.status(201).json({
      id: invoice.id,
      manifestUrl: `${baseUrl}/${invoice.id}`,
    });
  };
}
