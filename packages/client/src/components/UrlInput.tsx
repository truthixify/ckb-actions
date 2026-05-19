import { SdkError } from '@ckb-actions/sdk';
import { useState, type FormEvent } from 'react';
import { fetchManifest } from '../lib/api';
import { useActionStore } from '../lib/store';
import { Button } from './ds/Button';
import { Input } from './ds/Input';

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
    <form onSubmit={onSubmit} className="flex gap-0">
      <Input
        mono
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="ckb-action://publisher.example/swap?…"
        className="flex-1"
        aria-label="Action URL"
        disabled={isBusy}
      />
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={isBusy || draft.trim().length === 0}
        className="ml-px"
      >
        {isBusy ? 'Loading…' : 'Open'}
      </Button>
    </form>
  );
}
