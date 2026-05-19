import { useActionStore, type View } from '../lib/store';

const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'preview', label: 'Preview a URL' },
  { id: 'create', label: 'Create a URL' },
];

export function ViewSwitch() {
  const { view, setView } = useActionStore();

  return (
    <nav className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {VIEWS.map((v) => {
        const isActive = view === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={
              'rounded-md px-3 py-1.5 text-xs font-medium transition ' +
              (isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')
            }
          >
            {v.label}
          </button>
        );
      })}
    </nav>
  );
}
