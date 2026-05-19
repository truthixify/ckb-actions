import { useActionStore } from '../lib/store';
import { ActionList } from './ActionList';

export function ManifestCard() {
  const manifest = useActionStore((s) => s.manifest);
  if (!manifest) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <img
          src={manifest.icon}
          alt=""
          className="h-20 w-20 flex-shrink-0 rounded-xl border border-slate-200 bg-slate-100 object-cover"
        />
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{manifest.title}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-slate-600">
              {manifest.network}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{manifest.description}</p>
        </div>
      </div>

      <div className="mt-6">
        <ActionList />
      </div>
    </section>
  );
}
