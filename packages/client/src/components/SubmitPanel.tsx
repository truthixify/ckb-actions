import { SdkError, type ActionItem } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/connector-react';
import { useState } from 'react';
import { submitAction } from '../lib/api';
import { isParamsComplete, useActionStore } from '../lib/store';

interface SubmitPanelProps {
  action: ActionItem;
}

export function SubmitPanel({ action }: SubmitPanelProps) {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const { url, paramValues, phase, response, error, setSubmitting, setResponse, setError } =
    useActionStore();

  const [address, setAddress] = useState<string | null>(null);

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

  async function loadAddress() {
    if (!signer) return;
    const addr = await signer.getRecommendedAddress();
    setAddress(addr);
  }

  if (!address) {
    void loadAddress();
    return <p className="text-xs text-slate-500">Loading address…</p>;
  }

  const isComplete = isParamsComplete(action.parameters, paramValues);
  const isBusy = phase === 'submitting';

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

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-white p-2 text-xs text-slate-600">
        <div className="font-medium uppercase tracking-wider text-slate-500">Wallet address</div>
        <div className="mt-1 break-all font-mono text-slate-800">{address}</div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isComplete || isBusy}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBusy ? 'Submitting…' : action.label}
      </button>

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <div className="font-medium">{error.tag}</div>
          <div className="mt-0.5">{error.message}</div>
        </div>
      )}

      {response && (
        <div className="space-y-1 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <div className="font-medium">Action endpoint returned an OTX</div>
          {response.message && <div className="text-emerald-800">{response.message}</div>}
          <div className="mt-1 font-mono break-all text-emerald-700">
            {response.encoding}: {response.otx.slice(0, 80)}…
          </div>
          {response.callback && (
            <div className="text-emerald-700">callback: {response.callback}</div>
          )}
          <div className="mt-2 text-emerald-600">
            Wallet sign-and-submit is not wired in this reference. Pass{' '}
            <code>{`response.otx`}</code> to the active signer to complete the flow.
          </div>
        </div>
      )}
    </div>
  );
}
