import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware class name combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Render a long hex/address as `start…end` — for display only, full value goes in title/copy. */
export function truncateMiddle(value: string, head = 10, tail = 4): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const EXPLORER_HOST_BY_NETWORK: Record<'mainnet' | 'testnet', string> = {
  mainnet: 'https://explorer.nervos.org',
  testnet: 'https://pudge.explorer.nervos.org',
};

/** Build a Nervos explorer URL for a given transaction hash and network. */
export function explorerTxUrl(network: 'mainnet' | 'testnet', txHash: string): string {
  return `${EXPLORER_HOST_BY_NETWORK[network]}/transaction/${txHash}`;
}

/** Try to read a manifest URL's host for display (e.g. "publisher.example.com"). */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
