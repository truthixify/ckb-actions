/**
 * Wallet-side helpers used by the Preview submit flow. Extracted from
 * SubmitPanel so the logic can be unit-tested without React.
 */

interface OutPointLike {
  txHash: string;
  index: bigint | number;
}

interface InputLike {
  previousOutput: OutPointLike;
}

interface CellLookupClient {
  getCell(outPoint: OutPointLike): Promise<unknown | undefined>;
}

/**
 * Resolve each pre-existing OTX input against the chain before the wallet
 * tries to use it. Empty inputs are fine (consumer wallet will fund); the
 * point is catching publisher-supplied inputs with placeholder out-points
 * before completeInputsByCapacity does so with a less clear error.
 */
export async function preflightExistingInputs(
  inputs: ReadonlyArray<InputLike>,
  client: CellLookupClient,
): Promise<void> {
  for (const [idx, input] of inputs.entries()) {
    const cell = await client.getCell(input.previousOutput);
    if (!cell) {
      const ref = `${input.previousOutput.txHash.slice(0, 10)}…:${input.previousOutput.index.toString()}`;
      throw new Error(
        `Publisher-supplied input ${idx} (${ref}) does not exist on chain. This action's OTX appears to use placeholder data and cannot be submitted as-is.`,
      );
    }
  }
}

export type TransactionStatus =
  | 'sent'
  | 'pending'
  | 'proposed'
  | 'committed'
  | 'unknown'
  | 'rejected';

export interface WaitResult {
  status: TransactionStatus;
  blockNumber?: unknown;
  reason?: unknown;
}

export interface WaitClient {
  waitTransaction(
    hash: string,
    confirmations?: number,
    timeoutMs?: number,
    intervalMs?: number,
  ): Promise<WaitResult | undefined>;
}

export interface PollCallbacks {
  onConfirmed(blockNumber: string): void;
  onRejected(reason: string): void;
  onDropped(): void;
  /** Called when polling itself throws — non-fatal; the tx is still on chain. */
  onTransient?(err: unknown): void;
}

export interface PollOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_INTERVAL_MS = 4_000;

/**
 * Poll the chain for a submitted transaction's final state. Resolves once
 * one of the terminal callbacks fires (or polling errors out).
 */
export async function pollConfirmation(
  client: WaitClient,
  txHash: string,
  callbacks: PollCallbacks,
  options: PollOptions = {},
): Promise<void> {
  try {
    const result = await client.waitTransaction(
      txHash,
      0,
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      options.intervalMs ?? DEFAULT_INTERVAL_MS,
    );
    if (!result) return;

    if (result.status === 'committed') {
      const block = result.blockNumber == null ? '?' : String(result.blockNumber);
      callbacks.onConfirmed(block);
      return;
    }
    if (result.status === 'rejected') {
      const reason = typeof result.reason === 'string' ? result.reason : 'no reason given';
      callbacks.onRejected(reason);
      return;
    }
    if (result.status === 'unknown') {
      callbacks.onDropped();
      return;
    }
    // sent / pending / proposed → keep waiting; nothing to surface.
  } catch (err) {
    callbacks.onTransient?.(err);
  }
}
