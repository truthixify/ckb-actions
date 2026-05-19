import { ccc } from '@ckb-ccc/connector-react';
import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useActionStore } from '../lib/store';
import { Button } from './ds/Button';
import { Card } from './ds/Card';
import { Field, Input } from './ds/Input';
import { CopyableUrl } from './CopyableUrl';

const TIP_PATH = '/actions/tip-jar';

export function CreateTipForm() {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const { serverBaseUrl, setServerBaseUrl } = useActionStore();

  const [recipient, setRecipient] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAddress() {
      if (!signer) return;
      try {
        const addr = await signer.getRecommendedAddress();
        if (!cancelled) setRecipient(addr);
      } catch {
        /* user can paste manually */
      }
    }
    void loadAddress();
    return () => {
      cancelled = true;
    };
  }, [signer]);

  const canBuild = recipient.trim().length > 0;
  const manifestUrl = canBuild
    ? `${serverBaseUrl.replace(/\/$/, '')}${TIP_PATH}?recipient=${encodeURIComponent(recipient.trim())}`
    : '';

  return (
    <Card variant="review" padding="primary" className="flex flex-col gap-6">
      <div>
        <h2 className="text-heading-2">Tip jar URL</h2>
        <p className="mt-1 text-body text-[var(--color-text-secondary)]">
          Anyone who opens this URL can tip the recipient.
        </p>
      </div>

      <Field label="Action server" htmlFor="server-url-tip">
        <Input
          id="server-url-tip"
          mono
          value={serverBaseUrl}
          onChange={(e) => setServerBaseUrl(e.target.value)}
        />
      </Field>

      <Field label="Recipient (CKB testnet address)" htmlFor="tip-recipient">
        <div className="flex gap-0">
          <Input
            id="tip-recipient"
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

      {manifestUrl && (
        <Field label="Shareable URL">
          <CopyableUrl url={manifestUrl} />
        </Field>
      )}
    </Card>
  );
}
