import { useActionStore } from './lib/store';
import { CreateInvoiceForm } from './components/CreateInvoiceForm';
import { CreateTipForm } from './components/CreateTipForm';
import { ManifestCard } from './components/ManifestCard';
import { TopBar } from './components/TopBar';
import { UrlInput } from './components/UrlInput';
import { ViewSwitch } from './components/ViewSwitch';
import { Card } from './components/ds/Card';

export function App() {
  const { view, phase, error } = useActionStore();

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto w-full max-w-[640px] flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="text-heading-1 text-[var(--color-text-primary)]">
              {view === 'preview' ? 'Preview a transaction' : 'Create a shareable URL'}
            </h1>
            <p className="text-body text-[var(--color-text-secondary)] max-w-[480px]">
              {view === 'preview'
                ? 'Paste an Action URL to review the requested transaction and sign it with your wallet. The client never holds keys.'
                : 'Generate a tip or invoice URL anyone can open to pay you. The recipient is your wallet.'}
            </p>
            <div className="pt-2">
              <ViewSwitch />
            </div>
          </header>

          {view === 'preview' && (
            <div className="flex flex-col gap-6">
              <UrlInput />

              {phase === 'fetching' && (
                <p className="text-body-sm text-[var(--color-text-muted)]">Fetching manifest…</p>
              )}

              {phase === 'error' && error && !useActionStore.getState().manifest && (
                <Card variant="inset" padding="default" className="flex flex-col gap-1">
                  <span className="text-label text-[var(--color-danger)]">{error.tag}</span>
                  <span className="text-body-sm text-[var(--color-text-primary)]">
                    {error.message}
                  </span>
                </Card>
              )}

              <ManifestCard />
            </div>
          )}

          {view === 'create' && (
            <div className="flex flex-col gap-6">
              <CreateTipForm />
              <CreateInvoiceForm />
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-4 text-mono-sm text-[var(--color-text-muted)] flex justify-between max-w-[1200px] mx-auto w-full">
        <span>CKB Action Links — reference client</span>
        <span>v0.1.0</span>
      </footer>
    </div>
  );
}
