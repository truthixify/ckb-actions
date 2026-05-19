import { useActionStore } from './lib/store';
import { CreateInvoiceForm } from './components/CreateInvoiceForm';
import { CreateTipForm } from './components/CreateTipForm';
import { ManifestCard } from './components/ManifestCard';
import { UrlInput } from './components/UrlInput';
import { ViewSwitch } from './components/ViewSwitch';

export function App() {
  const { view, phase, error } = useActionStore();

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">CKB Action Links</h1>
          <p className="text-sm text-slate-600">
            {view === 'preview'
              ? 'Paste an action URL to preview the transaction; the wallet signs and submits.'
              : 'Generate a shareable URL someone can open to pay you.'}
          </p>
        </header>

        <ViewSwitch />

        {view === 'preview' && (
          <>
            <UrlInput />

            {phase === 'fetching' && <p className="text-sm text-slate-500">Fetching manifest…</p>}

            {phase === 'error' && error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
                <div className="font-medium text-rose-900">{error.tag}</div>
                <div className="mt-0.5 text-rose-800">{error.message}</div>
              </div>
            )}

            <ManifestCard />
          </>
        )}

        {view === 'create' && (
          <>
            <CreateTipForm />
            <CreateInvoiceForm />
          </>
        )}
      </div>
    </div>
  );
}
