import { ccc } from '@ckb-ccc/core';

const SECP256K1_BLAKE160_CODE_HASH =
  '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8';

/**
 * Spore type script code hash. PLACEHOLDER — a real DOB publisher pulls the
 * testnet value from @spore-sdk/core. The example demonstrates the §11.2
 * OTX shape; minting an on-chain spore would replace this with the
 * canonical hash and supply real spore-protocol cell deps.
 */
export const SPORE_TYPE_CODE_HASH = `0x${'5f'.repeat(32)}`;

/** Cluster type script code hash. Same placeholder caveat as the spore hash. */
export const CLUSTER_TYPE_CODE_HASH = `0x${'59'.repeat(32)}`;

/** Cluster id this publisher mints from. 32 bytes. */
export const CLUSTER_ID = `0x${'01'.repeat(32)}`;

/**
 * Publisher's existing cluster cell out-point. In production this is the
 * real on-chain location of the cluster cell; a placeholder is fine for the
 * reference because the consumer wallet never actually submits the OTX.
 */
export const PUBLISHER_CLUSTER_OUT_POINT = {
  txHash: `0x${'cc'.repeat(32)}`,
  index: 0n,
};

/** Publisher's lock — receives the preserved cluster output. */
export const PUBLISHER_LOCK = ccc.Script.from({
  codeHash: SECP256K1_BLAKE160_CODE_HASH,
  hashType: 'type',
  args: `0x${'ef'.repeat(20)}`,
});

/** Cluster type script (preserved on both sides of the mint). */
export const CLUSTER_TYPE = ccc.Script.from({
  codeHash: CLUSTER_TYPE_CODE_HASH,
  hashType: 'data1',
  args: CLUSTER_ID,
});

/** Capacity of the preserved cluster cell (shannons; 250 CKB demo value). */
export const PUBLISHER_CLUSTER_CAPACITY = 250n * 100_000_000n;

/** Capacity of the new spore cell (shannons; 145 CKB demo value). */
export const SPORE_CELL_CAPACITY = 145n * 100_000_000n;

/** Cluster cell data (UTF-8 JSON; real publishers use molecule-encoded ClusterData). */
export const CLUSTER_DATA = `0x${Buffer.from(
  JSON.stringify({
    name: 'Demo Cluster',
    description: 'Reference cluster for the DOB mint example.',
  }),
  'utf-8',
).toString('hex')}`;
