import { SdkError, type ActionItem } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/connector-react';
import { useEffect, useState } from 'react';
import { postCallback, submitAction } from '../lib/api';
import { isParamsComplete, useActionStore } from '../lib/store';

interface SubmitPanelProps {
  action: ActionItem;
}

export function SubmitPanel({ action }: SubmitPanelProps) {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const {
    url,
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
      <div className="space-y-2 rounded-md bg-slate-100 p-3 text-sm">
        <p className="text-slate-700">Connect a wallet to continue.</p>
        <button
          type="button"
          onClick={open}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          Connect wallet
        </button>
      </div>
    );
  }

  if (!address) {
    return <p className="text-xs text-slate-500">Loading address…</p>;
  }

  const isComplete = isParamsComplete(action.parameters, paramValues);
  const isSubmitting = phase === 'submitting';

  async function onSubmit() {
    setSubmitting();
    try {
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
      // exactOptionalPropertyTypes makes the resolved Transaction stricter
      // than CCC's TransactionLike param — runtime is fine; assert across.
      const hash = await signer.sendTransaction(
        tx as unknown as Parameters<typeof signer.sendTransaction>[0],
      );
      setSent(hash);
      if (response.callback) {
        await postCallback(url, response.callback, hash).catch(() => {
          // Callback failure does not undo the on-chain payment; surface
          // it as a warning rather than overwriting the success state.
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
    <div className="space-y-3">
      <div className="rounded-md bg-white p-2 text-xs text-slate-600">
        <div className="font-medium uppercase tracking-wider text-slate-500">Wallet address</div>
        <div className="mt-1 break-all font-mono text-slate-800">{address}</div>
      </div>

      {phase !== 'received' && phase !== 'signing' && phase !== 'sent' && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isComplete || isSubmitting}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Requesting OTX…' : action.label}
        </button>
      )}

      {response && (phase === 'received' || phase === 'signing' || phase === 'sent') && (
        <div className="space-y-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <div className="font-medium">Action endpoint returned an OTX</div>
          {response.message && <div className="text-emerald-800">{response.message}</div>}
          <div className="font-mono break-all text-emerald-700">
            {response.encoding}: {response.otx.slice(0, 80)}…
          </div>
          {response.callback && (
            <div className="text-emerald-700">callback: {response.callback}</div>
          )}
        </div>
      )}

      {phase === 'received' && (
        <button
          type="button"
          onClick={onSignAndSend}
          className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500"
        >
          Sign &amp; send with wallet
        </button>
      )}

      {phase === 'signing' && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Confirm in your wallet…
        </div>
      )}

      {phase === 'sent' && txHash && (
        <div className="space-y-1 rounded-md bg-emerald-100 px-3 py-2 text-xs text-emerald-900">
          <div className="font-medium">Transaction submitted</div>
          <div className="break-all font-mono text-emerald-800">{txHash}</div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <div className="font-medium">{error.tag}</div>
          <div className="mt-0.5">{error.message}</div>
        </div>
      )}
    </div>
  );
}
