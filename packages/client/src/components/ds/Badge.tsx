import type { Network } from '@ckb-actions/sdk';
import { cn } from '../../lib/utils';
import { StatusDot } from './StatusDot';

export function NetworkBadge({ network }: { network: Network }) {
  return (
    <span className="inline-flex items-center gap-2 px-2 h-6 border border-[var(--color-border-hairline)] bg-[var(--color-bg-elevated)] text-label text-[var(--color-text-secondary)]">
      <StatusDot tone={network} size={6} />
      <span>{network}</span>
    </span>
  );
}

export function DomainTag({ domain, trusted }: { domain: string; trusted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-mono-sm',
        trusted ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-warning)]',
      )}
    >
      <StatusDot tone={trusted ? 'success' : 'warning'} size={6} />
      <span>{domain}</span>
      {!trusted && <span className="text-label">UNVERIFIED</span>}
    </span>
  );
}
