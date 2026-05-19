import { ccc } from '@ckb-ccc/connector-react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { truncateMiddle } from '../lib/utils';
import { useActionStore } from '../lib/store';
import { StatusDot } from './ds/StatusDot';

export function TopBar() {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const manifest = useActionStore((s) => s.manifest);

  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!signer) {
        setAddress(null);
        return;
      }
      try {
        const addr = await signer.getRecommendedAddress();
        if (!cancelled) setAddress(addr);
      } catch {
        if (!cancelled) setAddress(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [signer]);

  return (
    <header className="h-14 border-b border-[var(--color-border-hairline)] bg-[var(--color-bg-base)]">
      <div className="mx-auto max-w-[1200px] h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[var(--color-accent)]" aria-hidden />
            <span className="font-display text-[14px] font-semibold tracking-tight">
              CKB Action Links
            </span>
          </div>
          {manifest && (
            <span className="inline-flex items-center gap-2 text-label text-[var(--color-text-secondary)]">
              <StatusDot tone={manifest.network} size={6} />
              <span>{manifest.network}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {address ? (
            <button
              type="button"
              onClick={open}
              className="inline-flex items-center gap-2 h-8 px-3 border border-[var(--color-border-hairline)] hover:bg-[var(--color-bg-elevated)] text-mono-sm transition-colors duration-[80ms]"
            >
              <span>{truncateMiddle(address, 8, 4)}</span>
              <ChevronDown size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={open}
              className="h-8 px-3 border border-[var(--color-border-hairline)] hover:bg-[var(--color-bg-elevated)] text-mono-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-[80ms]"
            >
              Connect wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
