import { cn } from '../lib/utils';
import { useActionStore, type View } from '../lib/store';

const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'preview', label: 'Preview a URL' },
  { id: 'create', label: 'Create a URL' },
];

export function ViewSwitch() {
  const { view, setView } = useActionStore();

  return (
    <nav className="inline-flex border border-[var(--color-border-hairline)] bg-[var(--color-bg-surface)]">
      {VIEWS.map((v) => {
        const isActive = view === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={cn(
              'h-9 px-4 text-label transition-colors duration-[80ms]',
              isActive
                ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]',
            )}
          >
            {v.label}
          </button>
        );
      })}
    </nav>
  );
}
