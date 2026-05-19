import { ccc } from '@ckb-ccc/connector-react';
import { useEffect, useState } from 'react';
import { useActionStore } from '../lib/store';
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
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Create a tip jar URL</h2>
        <p className="text-sm text-slate-600">
          Share the generated URL — anyone who opens it can tip you.
        </p>
      </header>

      <div className="space-y-1">
        <label htmlFor="server-url" className="block text-xs font-medium text-slate-700">
          Action server
        </label>
        <input
          id="server-url"
          type="text"
          value={serverBaseUrl}
          onChange={(e) => setServerBaseUrl(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="tip-recipient" className="block text-xs font-medium text-slate-700">
          Recipient (CKB testnet address)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="tip-recipient"
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

      {manifestUrl && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-700">Shareable tip URL</div>
          <CopyableUrl url={manifestUrl} />
        </div>
      )}
    </section>
  );
}
