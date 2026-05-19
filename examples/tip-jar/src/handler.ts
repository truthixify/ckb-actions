import {
  actionRequestSchema,
  InvalidAddressError,
  InvalidParamsError,
  type ActionResponse,
} from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/core';
import type { Request, Response } from 'express';
import { z } from 'zod';

const SHANNONS_PER_CKB = 100_000_000n;
const MIN_TIP_CKB = 61;
const MAX_TIP_CKB = 1_000_000;

const submitQuerySchema = z.object({
  amount: z.coerce.number().int().min(MIN_TIP_CKB).max(MAX_TIP_CKB),
  recipient: z.string().min(1),
});

async function recipientLock(recipient: string): Promise<ccc.Script> {
  try {
    const parsed = await ccc.Address.fromString(recipient, new ccc.ClientPublicTestnet());
    return parsed.script;
  } catch (cause) {
    throw new InvalidParamsError(`Recipient "${recipient}" is not a valid CKB testnet address`, {
      cause,
    });
  }
}

/**
 * Build an OTX that pays the tip amount to the recipient lock supplied in
 * the URL. Outputs are fully specified; inputs and witnesses are left empty
 * so the consumer's wallet funds the transaction and adds the change output.
 *
 * @spec §6.2, §7, §11.1
 */
export async function handleTipJarSubmit(req: Request, res: Response): Promise<void> {
  const queryResult = submitQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new InvalidParamsError(
      `Invalid query: amount must be ${MIN_TIP_CKB}-${MAX_TIP_CKB} CKB and recipient must be a CKB address`,
    );
  }
  const { amount, recipient } = queryResult.data;
  const lock = await recipientLock(recipient);

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
    outputs: [{ lock, capacity: tipShannons }],
    outputsData: ['0x'],
  });

  const response: ActionResponse = {
    type: 'transaction',
    encoding: 'molecule',
    otx: ccc.hexFrom(tx.toBytes()),
    message: `Tip ${amount} CKB to ${recipient.slice(0, 14)}…`,
  };
  res.json(response);
}
