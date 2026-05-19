import {
  actionRequestSchema,
  InvalidAddressError,
  InvalidParamsError,
  type ActionResponse,
} from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/core';
import type { Request, Response } from 'express';
import {
  CLUSTER_DATA,
  CLUSTER_ID,
  CLUSTER_TYPE,
  PUBLISHER_CLUSTER_CAPACITY,
  PUBLISHER_CLUSTER_OUT_POINT,
  PUBLISHER_LOCK,
  SPORE_CELL_CAPACITY,
  SPORE_TYPE_CODE_HASH,
} from './config.js';

const SECP256K1_SIG_LEN = 65;
const PLACEHOLDER_PUBLISHER_WITNESS = ccc.hexFrom(
  ccc.WitnessArgs.from({ lock: `0x${'00'.repeat(SECP256K1_SIG_LEN)}` }).toBytes(),
);

function buildSporeData(consumerLockHash: string): string {
  const body = JSON.stringify({
    clusterId: CLUSTER_ID,
    contentType: 'application/json',
    content: { ownerLockHash: consumerLockHash, demo: true },
  });
  return `0x${Buffer.from(body, 'utf-8').toString('hex')}`;
}

/**
 * Build an OTX that mints a new spore cell to the consumer:
 *
 *   inputs:  [publisher's cluster cell]
 *   outputs: [cluster cell preserved, new spore cell owned by consumer]
 *
 * The consumer wallet adds its own input cells, change output, fee, and
 * signs its witnesses. The publisher's witness is a placeholder here; a
 * production publisher pre-signs the cluster input before transmission.
 *
 * @spec §6.2, §7, §11.2
 */
export async function handleDobMintSubmit(req: Request, res: Response): Promise<void> {
  const bodyResult = actionRequestSchema.safeParse(req.body);
  if (!bodyResult.success) {
    throw new InvalidParamsError(`malformed request body: ${bodyResult.error.message}`);
  }
  const { address } = bodyResult.data;

  let consumerLock: ccc.Script;
  try {
    const parsed = await ccc.Address.fromString(address, new ccc.ClientPublicTestnet());
    consumerLock = parsed.script;
  } catch (cause) {
    throw new InvalidAddressError(`"${address}" is not a valid CKB testnet address`, { cause });
  }

  const sporeId = consumerLock.hash();
  const sporeType = ccc.Script.from({
    codeHash: SPORE_TYPE_CODE_HASH,
    hashType: 'data1',
    args: sporeId,
  });

  const tx = ccc.Transaction.from({
    inputs: [
      {
        previousOutput: PUBLISHER_CLUSTER_OUT_POINT,
        since: 0n,
      },
    ],
    outputs: [
      { lock: PUBLISHER_LOCK, type: CLUSTER_TYPE, capacity: PUBLISHER_CLUSTER_CAPACITY },
      { lock: consumerLock, type: sporeType, capacity: SPORE_CELL_CAPACITY },
    ],
    outputsData: [CLUSTER_DATA, buildSporeData(sporeId)],
    witnesses: [PLACEHOLDER_PUBLISHER_WITNESS],
  });

  const response: ActionResponse = {
    type: 'transaction',
    encoding: 'molecule',
    otx: ccc.hexFrom(tx.toBytes()),
    message: 'Mint a Demo Spore — the wallet adds your inputs and fee, then signs',
  };
  res.json(response);
}
