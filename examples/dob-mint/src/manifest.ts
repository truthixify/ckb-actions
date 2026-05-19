import type { Manifest } from '@ckb-actions/sdk';

/**
 * Single-action manifest: "Mint" produces a new spore cell tied to the
 * publisher's cluster, owned by the connected wallet.
 *
 * @spec §6.1, §11.2
 */
export function buildDobMintManifest(baseUrl: string): Manifest {
  return {
    type: 'action',
    title: 'Mint a Demo Spore',
    description:
      "Claim a one-of-a-kind spore cell tied to the publisher's cluster. The publisher contributes a signed cluster input; the wallet funds the spore cell and fee.",
    icon: 'https://placehold.co/512x512?text=DOB',
    label: 'Mint',
    network: 'testnet',
    links: {
      actions: [{ label: 'Mint', href: `${baseUrl}/submit` }],
    },
  };
}
