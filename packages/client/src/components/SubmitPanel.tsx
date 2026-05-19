import { SdkError, UnsupportedNetworkError, type ActionItem, type Network } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/connector-react';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { postCallback, submitAction } from '../lib/api';
import { isParamsComplete, useActionStore } from '../lib/store';
import { cn, explorerTxUrl, truncateMiddle } from '../lib/utils';
import { Button } from './ds/Button';
import { Card } from './ds/Card';
import { MonoValue } from './ds/Mono';
import { StatusDot } from './ds/StatusDot';

const NETWORK_PREFIX: Record<Network, string> = { mainnet: 'ckb', testnet: 'ckt' };

interface SubmitPanelProps {
  action: ActionItem;
}

export function SubmitPanel({ action }: SubmitPanelProps) {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const {
    url,
    manifest,
    paramValues,
    phase,
    response,
    txHash,
    error,
    setSubmitting,
    setResponse,
    setSigning,
    setSent,
    setError,
  } = useActionStore();

  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAddress() {
      if (!signer) {
        setAddress(null);
        return;
      }
      try {
        const addr = await signer.getRecommendedAddress();
        if (!cancelled) setAddress(addr);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError({ tag: 'unknown', message });
        }
      }
    }
    void loadAddress();
    return () => {
      cancelled = true;
    };
  }, [signer, setError]);

  if (!signer) {
    return (
      <Card variant="inset" padding="default" className="flex items-center justify-between">
        <span className="text-body-sm text-[var(--color-text-secondary)]">
          Connect a wallet to continue.
        </span>
        <Button variant="primary" size="sm" onClick={open}>
          Connect wallet
        </Button>
      </Card>
    );
  }

  if (!address) {
    return <p className="text-body-sm text-[var(--color-text-muted)]">Loading address…</p>;
  }

  const isComplete = isParamsComplete(action.parameters, paramValues);

  function assertNetworkMatch(): void {
    if (!manifest || !signer) return;
    const expectedPrefix = NETWORK_PREFIX[manifest.network];
    const walletPrefix = signer.client.addressPrefix;
    if (walletPrefix !== expectedPrefix) {
      throw new UnsupportedNetworkError(
        `Wallet is on ${walletPrefix === 'ckb' ? 'mainnet' : 'testnet'} but this action targets ${manifest.network}. Switch networks in your wallet and reconnect.`,
      );
    }
  }

  async function onSubmit() {
    setSubmitting();
    try {
      assertNetworkMatch();
      const res = await submitAction(url, action, paramValues, address!);
      setResponse(res);
    } catch (err) {
      const tag = err instanceof SdkError ? err.tag : 'unknown';
      const message = err instanceof Error ? err.message : String(err);
      setError({ tag, message });
    }
  }

  async function onSignAndSend() {
    if (!response || !signer) return;
    setSigning();
    try {
      const tx = ccc.Transaction.fromBytes(ccc.bytesFrom(response.otx));
      await tx.completeInputsByCapacity(signer);
      await tx.completeFeeBy(signer);
      const txLike = tx as unknown as Parameters<typeof signer.sendTransaction>[0];
      const hash = await signer.sendTransaction(txLike);
      setSent(hash);
      if (response.callback) {
        await postCallback(url, response.callback, hash).catch(() => {
          console.warn('callback POST failed; tx already on chain');
        });
      }
    } catch (err) {
      const tag = err instanceof SdkError ? err.tag : 'wallet_error';
      const message = err instanceof Error ? err.message : String(err);
      setError({ tag, message });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-[var(--color-text-secondary)]">Wallet</span>
        <MonoValue value={address} size="sm" />
      </div>

      {!response && phase !== 'submitting' && (
        <Button variant="primary" size="md" fullWidth onClick={onSubmit} disabled={!isComplete}>
          {phase === 'error' ? `Try again — ${action.label}` : action.label}
        </Button>
      )}

      {phase === 'submitting' && (
        <Card variant="surface" padding="default" className="flex items-center gap-3">
          <StatusDot tone="accent" size={10} pulse />
          <span className="text-body-sm text-[var(--color-text-primary)]">
            Requesting OTX from action endpoint…
          </span>
        </Card>
      )}

      {response && (
        <Card variant="inset" padding="default" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-label text-[var(--color-text-secondary)]">Open transaction</span>
            <span className="text-mono-sm text-[var(--color-text-muted)]">{response.encoding}</span>
          </div>
          {response.message && (
            <p className="text-body-sm text-[var(--color-text-primary)]">{response.message}</p>
          )}
          <pre className="text-mono-sm text-[var(--color-text-muted)] overflow-x-auto whitespace-pre break-all">
            {response.otx.slice(0, 120)}
            {response.otx.length > 120 ? '…' : ''}
          </pre>
          {response.callback && (
            <div className="flex items-center justify-between text-mono-sm text-[var(--color-text-muted)]">
              <span className="text-label">Callback</span>
              <span>{response.callback}</span>
            </div>
          )}
        </Card>
      )}

      {response && (phase === 'received' || phase === 'error') && (
        <Button variant="primary" size="md" fullWidth onClick={onSignAndSend}>
          {phase === 'error' ? 'Retry — Sign & send' : 'Sign & send with wallet'}
        </Button>
      )}

      {phase === 'signing' && (
        <Card variant="surface" padding="default" className="flex items-center gap-3">
          <StatusDot tone="accent" size={10} pulse />
          <span className="text-body-sm text-[var(--color-text-primary)]">
            Confirm in your wallet…
          </span>
        </Card>
      )}

      {phase === 'sent' && txHash && manifest && (
        <Card variant="surface" padding="default" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <StatusDot tone="success" size={10} />
            <span className="text-heading-3">Transaction submitted</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label text-[var(--color-text-secondary)]">Hash</span>
            <a
              href={explorerTxUrl(manifest.network, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-2 text-mono break-all',
                'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]',
                'transition-colors duration-[80ms]',
              )}
              title={txHash}
            >
              <span className="truncate">{truncateMiddle(txHash, 14, 8)}</span>
              <ExternalLink size={14} strokeWidth={1.5} className="shrink-0" />
            </a>
          </div>
        </Card>
      )}

      {error && (
        <Card variant="inset" padding="default" className="flex flex-col gap-1">
          <span className="text-label text-[var(--color-danger)]">{error.tag}</span>
          <span className="text-body-sm text-[var(--color-text-primary)]">{error.message}</span>
        </Card>
      )}
    </div>
  );
}
