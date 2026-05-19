import type { ActionItem, ParamValue } from '@ckb-actions/sdk';
import { useActionStore } from '../lib/store';
import { Field, Input } from './ds/Input';

interface ParameterFormProps {
  action: ActionItem;
}

export function ParameterForm({ action }: ParameterFormProps) {
  const { paramValues, setParam } = useActionStore();

  if (!action.parameters || action.parameters.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {action.parameters.map((p) => {
        const value = paramValues[p.name];
        const inputId = `param-${p.name}`;

        if (p.type === 'select') {
          return (
            <Field key={p.name} label={p.label} htmlFor={inputId}>
              <select
                id={inputId}
                value={String(value ?? '')}
                onChange={(e) => setParam(p.name, e.target.value)}
                className="h-10 w-full px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-mono text-[14px] focus:outline-none focus:border-[var(--color-accent)] transition-colors duration-[80ms]"
              >
                <option value="">Select…</option>
                {p.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
          );
        }

        return (
          <Field key={p.name} label={p.label} htmlFor={inputId}>
            <Input
              id={inputId}
              type={p.type === 'number' ? 'number' : 'text'}
              mono
              value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
              onChange={(e) => {
                const next: ParamValue =
                  p.type === 'number' ? Number(e.target.value) : e.target.value;
                setParam(p.name, next);
              }}
            />
          </Field>
        );
      })}
    </div>
  );
}
