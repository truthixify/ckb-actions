import {
  actionRequestSchema,
  InvalidAddressError,
  InvalidParamsError,
  type ActionResponse,
} from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/core';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { TIP_JAR_RECIPIENT_LOCK } from './config.js';

const SHANNONS_PER_CKB = 100_000_000n;
const MIN_TIP_CKB = 61;
const MAX_TIP_CKB = 1_000_000;

const submitQuerySchema = z.object({
  amount: z.coerce.number().int().min(MIN_TIP_CKB).max(MAX_TIP_CKB),
});

/**
 * Build an OTX that pays the tip amount to the publisher's recipient lock.
 * Outputs are fully specified; inputs and witnesses are left empty so the
 * consumer's wallet can fund the transaction and add the change output.
 *
 * @spec §6.2, §7, §11.1
 */
export async function handleTipJarSubmit(req: Request, res: Response): Promise<void> {
  const queryResult = submitQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new InvalidParamsError(
      `Invalid amount: must be an integer between ${MIN_TIP_CKB} and ${MAX_TIP_CKB} CKB`,
    );
  }
  const { amount } = queryResult.data;

  const bodyResult = actionRequestSchema.safeParse(req.body);
  if (!bodyResult.success) {
    throw new InvalidParamsError(`Malformed request body: ${bodyResult.error.message}`);
  }
  const { address } = bodyResult.data;

  try {
    await ccc.Address.fromString(address, new ccc.ClientPublicTestnet());
  } catch (cause) {
    throw new InvalidAddressError(`"${address}" is not a valid CKB testnet address`, { cause });
  }

  const tipShannons = BigInt(amount) * SHANNONS_PER_CKB;
  const tx = ccc.Transaction.from({
    outputs: [{ lock: TIP_JAR_RECIPIENT_LOCK, capacity: tipShannons }],
    outputsData: ['0x'],
  });

  const response: ActionResponse = {
    type: 'transaction',
    encoding: 'molecule',
    otx: ccc.hexFrom(tx.toBytes()),
    message: `Tip ${amount} CKB to the publisher`,
  };
  res.json(response);
}
