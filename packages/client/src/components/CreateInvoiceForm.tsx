import { SdkError } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/connector-react';
import { useEffect, useState, type FormEvent } from 'react';
import { createInvoice } from '../lib/api';
import { useActionStore } from '../lib/store';
import { CopyableUrl } from './CopyableUrl';

const MIN_AMOUNT_CKB = 61;

export function CreateInvoiceForm() {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const { serverBaseUrl } = useActionStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<{ url: string; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAddress() {
      if (!signer) return;
      try {
        const addr = await signer.getRecommendedAddress();
        if (!cancelled) setRecipient(addr);
      } catch {
        /* paste manually */
      }
    }
    void loadAddress();
    return () => {
      cancelled = true;
    };
  }, [signer]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await createInvoice(serverBaseUrl, {
        amount,
        description: description.trim(),
        recipient: recipient.trim(),
      });
      const fullUrl = new URL(res.manifestUrl, serverBaseUrl).href;
      setResult({ url: fullUrl, id: res.id });
    } catch (err) {
      const tag = err instanceof SdkError ? err.tag : 'unknown';
      const message = err instanceof Error ? err.message : String(err);
      setError(`${tag}: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    recipient.trim().length > 0 && description.trim().length > 0 && amount >= MIN_AMOUNT_CKB;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Create an invoice</h2>
        <p className="text-sm text-slate-600">
          Generates a one-time URL. The first payer who completes it marks the invoice paid.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="inv-amount" className="block text-xs font-medium text-slate-700">
            Amount (CKB) — minimum {MIN_AMOUNT_CKB}
          </label>
          <input
            id="inv-amount"
            type="number"
            min={MIN_AMOUNT_CKB}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="inv-description" className="block text-xs font-medium text-slate-700">
            Description
          </label>
          <input
            id="inv-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this invoice for?"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="inv-recipient" className="block text-xs font-medium text-slate-700">
            Recipient (CKB testnet address)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="inv-recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="ckt1q…"
              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm"
            />
            {!signer && (
              <button
                type="button"
                onClick={open}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                Use wallet
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isBusy}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? 'Creating…' : 'Create invoice'}
        </button>
      </form>

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>
      )}

      {result && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-700">Shareable invoice URL</div>
          <CopyableUrl url={result.url} />
          <div className="text-xs text-slate-500">id: {result.id}</div>
        </div>
      )}
    </section>
  );
}
