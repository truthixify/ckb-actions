import { SdkError } from '@ckb-actions/sdk';
import { useState, type FormEvent } from 'react';
import { fetchManifest } from '../lib/api';
import { useActionStore } from '../lib/store';

export function UrlInput() {
  const { url, phase, setUrl, startFetching, setManifest, setError } = useActionStore();
  const [draft, setDraft] = useState(url);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUrl(draft);
    startFetching();
    try {
      const manifest = await fetchManifest(draft);
      setManifest(manifest);
    } catch (err) {
      const tag = err instanceof SdkError ? err.tag : 'unknown';
      const message = err instanceof Error ? err.message : String(err);
      setError({ tag, message });
    }
  }

  const isBusy = phase === 'fetching';

  return (
    <form onSubmit={onSubmit} className="flex w-full gap-2">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="ckb-action:https://… or https://…"
        className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        disabled={isBusy}
      />
      <button
        type="submit"
        disabled={isBusy || draft.trim().length === 0}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBusy ? 'Fetching…' : 'Load action'}
      </button>
    </form>
  );
}
