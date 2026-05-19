import type { ActionItem, ParamValue } from '@ckb-actions/sdk';
import { useActionStore } from '../lib/store';

interface ParameterFormProps {
  action: ActionItem;
}

export function ParameterForm({ action }: ParameterFormProps) {
  const { paramValues, setParam } = useActionStore();

  if (!action.parameters || action.parameters.length === 0) return null;

  return (
    <div className="space-y-2">
      {action.parameters.map((p) => {
        const value = paramValues[p.name];
        const inputId = `param-${p.name}`;

        if (p.type === 'select') {
          return (
            <div key={p.name} className="space-y-1">
              <label htmlFor={inputId} className="block text-xs font-medium text-slate-700">
                {p.label}
                {p.required && <span className="ml-1 text-rose-600">*</span>}
              </label>
              <select
                id={inputId}
                value={String(value ?? '')}
                onChange={(e) => setParam(p.name, e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm"
              >
                <option value="">Select…</option>
                {p.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return (
          <div key={p.name} className="space-y-1">
            <label htmlFor={inputId} className="block text-xs font-medium text-slate-700">
              {p.label}
              {p.required && <span className="ml-1 text-rose-600">*</span>}
            </label>
            <input
              id={inputId}
              type={p.type === 'number' ? 'number' : 'text'}
              value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
              onChange={(e) => {
                const next: ParamValue =
                  p.type === 'number' ? Number(e.target.value) : e.target.value;
                setParam(p.name, next);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm"
            />
          </div>
        );
      })}
    </div>
  );
}
