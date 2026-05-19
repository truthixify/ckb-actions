import { ccc } from '@ckb-ccc/core';

const SECP256K1_BLAKE160_CODE_HASH =
  '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8';
const DEMO_RECIPIENT_ARGS = `0x${'ab'.repeat(20)}`;

/**
 * Lock script the tip jar pays into. Placeholder values are used so the
 * example is runnable as-is — a real publisher would substitute their own
 * pubkey hash via env or a config file.
 */
export const TIP_JAR_RECIPIENT_LOCK = ccc.Script.from({
  codeHash: SECP256K1_BLAKE160_CODE_HASH,
  hashType: 'type',
  args: DEMO_RECIPIENT_ARGS,
});
