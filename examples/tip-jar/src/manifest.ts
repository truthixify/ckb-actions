import type { Manifest } from '@ckb-actions/sdk';

/**
 * Build the tip jar Manifest, with hrefs rooted at the path the consumer
 * server has mounted this action under.
 *
 * @spec §6.1, §11.1
 */
export function buildTipJarManifest(baseUrl: string): Manifest {
  return {
    type: 'action',
    title: 'Tip the publisher',
    description: 'Send a CKB tip to the publisher. The wallet adds the input cells and fee.',
    icon: 'https://placehold.co/512x512?text=Tip',
    label: 'Tip',
    network: 'testnet',
    links: {
      actions: [
        { label: 'Tip 100 CKB', href: `${baseUrl}/submit?amount=100` },
        { label: 'Tip 1000 CKB', href: `${baseUrl}/submit?amount=1000` },
        {
          label: 'Custom amount',
          href: `${baseUrl}/submit?amount={amount}`,
          parameters: [{ name: 'amount', label: 'Amount (CKB)', type: 'number', required: true }],
        },
      ],
    },
  };
}
