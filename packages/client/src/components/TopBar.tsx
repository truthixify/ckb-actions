import { ccc } from '@ckb-ccc/connector-react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { truncateMiddle } from '../lib/utils';
import { useActionStore } from '../lib/store';
import { StatusDot } from './ds/StatusDot';

/**
 * Time we wait after mount before assuming "no session" and showing the
 * Connect button. CCC restores a previously-connected wallet asynchronously;
 * without this guard, the page flashes "Connect wallet" for ~200ms even
 * when the user is already connected.
 */
const HYDRATION_GRACE_MS = 350;

export function TopBar() {
  const signer = ccc.useSigner();
  const { open, disconnect } = ccc.useCcc();
  const manifest = useActionStore((s) => s.manifest);

  const [address, setAddress] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setHydrated(true), HYDRATION_GRACE_MS);
    return () => window.clearTimeout(t);
  }, []);

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

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  function onDisconnect() {
    setMenuOpen(false);
    disconnect();
  }

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
          {!hydrated ? (
            <span className="text-mono-sm text-[var(--color-text-muted)]" aria-hidden>
              …
            </span>
          ) : address ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 h-8 px-3 border border-[var(--color-border-hairline)] hover:bg-[var(--color-bg-elevated)] text-mono-sm transition-colors duration-[80ms]"
              >
                <span>{truncateMiddle(address, 8, 4)}</span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.5}
                  className="text-[var(--color-text-muted)]"
                />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 min-w-[280px] bg-[var(--color-bg-elevated)] border border-[var(--color-border-hairline)] shadow-lg">
                  <div className="px-3 py-2 border-b border-[var(--color-border-hairline)]">
                    <div className="text-label text-[var(--color-text-secondary)]">Address</div>
                    <div className="text-mono-sm break-all text-[var(--color-text-primary)] pt-1">
                      {address}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onDisconnect}
                    className="w-full inline-flex items-center justify-between px-3 h-9 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors duration-[80ms]"
                  >
                    <span className="text-body-sm">Disconnect</span>
                    <LogOut
                      size={14}
                      strokeWidth={1.5}
                      className="text-[var(--color-text-muted)]"
                    />
                  </button>
                </div>
              )}
            </div>
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
