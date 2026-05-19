import { useState } from 'react';

interface CopyableUrlProps {
  url: string;
}

export function CopyableUrl({ url }: CopyableUrlProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — older browsers, no permission
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
      <code className="flex-1 break-all font-mono text-xs text-slate-800">{url}</code>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
