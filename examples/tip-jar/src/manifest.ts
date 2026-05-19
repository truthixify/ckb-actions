import type { Manifest } from '@ckb-actions/sdk';

const FIXED_AMOUNTS_CKB = [100, 1000];

function encodeRecipient(recipient: string): string {
  return encodeURIComponent(recipient);
}

/**
 * Build the tip jar Manifest paying into `recipient`. Hrefs include the
 * recipient as a query param so the resolved POST URL carries it along.
 *
 * @spec §6.1, §11.1
 */
export function buildTipJarManifest(baseUrl: string, recipient: string): Manifest {
  const recipientParam = `recipient=${encodeRecipient(recipient)}`;
  const truncated = `${recipient.slice(0, 12)}…${recipient.slice(-6)}`;

  return {
    type: 'action',
    title: `Tip ${truncated}`,
    description: 'Send a CKB tip. The wallet adds the input cells and fee.',
    icon: 'https://placehold.co/512x512?text=Tip',
    label: 'Tip',
    network: 'testnet',
    links: {
      actions: [
        ...FIXED_AMOUNTS_CKB.map((amount) => ({
          label: `Tip ${amount} CKB`,
          href: `${baseUrl}/submit?${recipientParam}&amount=${amount}`,
        })),
        {
          label: 'Custom amount',
          href: `${baseUrl}/submit?${recipientParam}&amount={amount}`,
          parameters: [
            { name: 'amount', label: 'Amount (CKB)', type: 'number' as const, required: true },
          ],
        },
      ],
    },
  };
}
