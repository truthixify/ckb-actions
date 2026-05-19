import { SdkError } from '@ckb-actions/sdk';

interface FriendlyError {
  tag: string;
  message: string;
}

const PATTERNS: ReadonlyArray<{
  match: RegExp;
  tag: string;
  message: (raw: string) => string;
}> = [
  {
    match: /Empty\(Inputs\)/i,
    tag: 'wallet_error',
    message: () =>
      'Wallet did not collect any input cells. Try refreshing and signing again — if it persists, the wallet may not support this OTX.',
  },
  {
    match: /OutPoint(?:Not| does ?not ?exist| not found|Unknown)/i,
    tag: 'publisher_input_missing',
    message: () =>
      'A publisher-supplied input cell does not exist on chain. This action appears to use placeholder data and cannot be submitted as-is.',
  },
  {
    match: /insufficient capacity|InsufficientCapacity|not enough capacity/i,
    tag: 'insufficient_capacity',
    message: () => 'Wallet does not have enough CKB to fund the transaction plus the network fee.',
  },
  {
    match: /user (rejected|denied)|action_?rejected|rejected by user/i,
    tag: 'user_rejected',
    message: () => 'You rejected the signature request in your wallet.',
  },
  {
    match: /network.*(?:unreachable|timeout)|ENOTFOUND|ECONNREFUSED/i,
    tag: 'network_error',
    message: (raw) => `Could not reach the network: ${raw}`,
  },
];

/**
 * Translate raw wallet/RPC errors into a tagged + message pair the UI can
 * render predictably. Falls back to the underlying message if no pattern
 * matches so we never swallow the original cause.
 */
export function friendlyMessage(err: unknown): FriendlyError {
  if (err instanceof SdkError) return { tag: err.tag, message: err.message };
  const raw = err instanceof Error ? err.message : String(err);
  for (const { match, tag, message } of PATTERNS) {
    if (match.test(raw)) return { tag, message: message(raw) };
  }
  return { tag: 'wallet_error', message: raw };
}
