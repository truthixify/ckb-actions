import { SdkError } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/connector-react';
import { Wallet } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { createInvoice } from '../lib/api';
import { useActionStore } from '../lib/store';
import { Button } from './ds/Button';
import { Card } from './ds/Card';
import { Field, Input } from './ds/Input';
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
    <Card variant="review" padding="primary" className="flex flex-col gap-6">
      <div>
        <h2 className="text-heading-2">Invoice URL</h2>
        <p className="mt-1 text-body text-[var(--color-text-secondary)]">
          Generates a one-time URL. The first payer who completes it marks the invoice paid.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={`Amount (CKB) — min ${MIN_AMOUNT_CKB}`} htmlFor="inv-amount">
          <Input
            id="inv-amount"
            type="number"
            mono
            min={MIN_AMOUNT_CKB}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </Field>

        <Field label="Description" htmlFor="inv-description">
          <Input
            id="inv-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this invoice for?"
          />
        </Field>

        <Field label="Recipient (CKB testnet address)" htmlFor="inv-recipient">
          <div className="flex gap-0">
            <Input
              id="inv-recipient"
              mono
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="ckt1q…"
              className="flex-1"
            />
            {!signer && (
              <Button variant="secondary" size="md" onClick={open} className="ml-px shrink-0">
                <Wallet size={14} strokeWidth={1.5} />
                Use wallet
              </Button>
            )}
          </div>
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!canSubmit || isBusy}
          loading={isBusy}
        >
          Create invoice
        </Button>
      </form>

      {error && (
        <Card variant="inset" padding="default" className="flex flex-col gap-1">
          <span className="text-label text-[var(--color-danger)]">Error</span>
          <span className="text-body-sm text-[var(--color-text-primary)]">{error}</span>
        </Card>
      )}

      {result && (
        <Field label="Shareable URL" helper={`id: ${result.id}`}>
          <CopyableUrl url={result.url} />
        </Field>
      )}
    </Card>
  );
}
