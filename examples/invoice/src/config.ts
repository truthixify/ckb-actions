import { ccc } from '@ckb-ccc/core';

const SECP256K1_BLAKE160_CODE_HASH =
  '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8';
const DEMO_MERCHANT_ARGS = `0x${'cd'.repeat(20)}`;

/** Placeholder merchant lock; substitute in production. */
export const INVOICE_RECIPIENT_LOCK = ccc.Script.from({
  codeHash: SECP256K1_BLAKE160_CODE_HASH,
  hashType: 'type',
  args: DEMO_MERCHANT_ARGS,
});
