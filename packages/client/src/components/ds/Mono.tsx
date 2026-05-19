import { Check, Copy } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { cn, truncateMiddle } from '../../lib/utils';

export interface MonoValueProps {
  value: string;
  truncate?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function MonoValue({ value, truncate = true, className, size = 'md' }: MonoValueProps) {
  const [copied, setCopied] = useState(false);
  const display = truncate ? truncateMiddle(value) : value;

  async function copy(e: MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <span
      className={cn(
        'group inline-flex items-center gap-2 text-[var(--color-text-primary)]',
        size === 'sm' ? 'text-mono-sm' : 'text-mono',
        className,
      )}
      title={value}
    >
      <span className="truncate">{display}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy"
        className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-opacity"
      >
        {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
      </button>
    </span>
  );
}
