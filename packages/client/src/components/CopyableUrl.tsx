import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CopyableUrlProps {
  url: string;
}

export function CopyableUrl({ url }: CopyableUrlProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="flex items-stretch gap-0 border border-[var(--color-border-hairline)] bg-[var(--color-bg-inset)]">
      <code className="flex-1 px-3 py-2 break-all text-mono-sm text-[var(--color-text-primary)]">
        {url}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 inline-flex items-center gap-2 px-3 border-l border-[var(--color-border-hairline)] text-label text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors duration-[80ms]"
      >
        {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}
