import type { Manifest } from '@ckb-actions/sdk';
import type { Invoice } from './store.js';

/**
 * Build the Manifest for a single invoice. The action has no user-supplied
 * parameters — the amount is fixed by the invoice itself.
 *
 * @spec §6.1, §11.3
 */
export function buildInvoiceManifest(baseUrl: string, invoice: Invoice): Manifest {
  const truncated = `${invoice.recipient.slice(0, 12)}…${invoice.recipient.slice(-6)}`;
  return {
    type: 'action',
    title: `Pay invoice: ${invoice.description}`,
    description: `One-time invoice for ${invoice.amount} CKB to ${truncated}.`,
    icon: 'https://placehold.co/512x512?text=Invoice',
    label: 'Pay',
    network: 'testnet',
    links: {
      actions: [
        {
          label: `Pay ${invoice.amount} CKB`,
          href: `${baseUrl}/${invoice.id}/submit`,
        },
      ],
    },
  };
}
