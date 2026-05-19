import { cn } from '../../lib/utils';

export type Tone = 'success' | 'danger' | 'warning' | 'accent' | 'mainnet' | 'testnet' | 'muted';

const toneMap: Record<Tone, string> = {
  success: 'bg-[var(--color-success)]',
  danger: 'bg-[var(--color-danger)]',
  warning: 'bg-[var(--color-warning)]',
  accent: 'bg-[var(--color-accent)]',
  mainnet: 'bg-[var(--color-network-mainnet)]',
  testnet: 'bg-[var(--color-network-testnet)]',
  muted: 'bg-[var(--color-text-muted)]',
};

export interface StatusDotProps {
  tone?: Tone;
  size?: number;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ tone = 'accent', size = 8, pulse, className }: StatusDotProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        'inline-block shrink-0 rounded-full',
        toneMap[tone],
        pulse && 'pulse-signing',
        className,
      )}
    />
  );
}
