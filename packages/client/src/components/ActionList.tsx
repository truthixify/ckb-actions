import { useActionStore } from '../lib/store';
import { ParameterForm } from './ParameterForm';
import { SubmitPanel } from './SubmitPanel';

export function ActionList() {
  const { manifest, selectedAction, selectAction } = useActionStore();
  if (!manifest) return null;

  return (
    <div className="space-y-3">
      {manifest.links.actions.map((action, idx) => {
        const isSelected = selectedAction === action;
        return (
          <div key={`${action.label}-${idx}`} className="rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => selectAction(isSelected ? null : action)}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-900">{action.label}</span>
              <span className="text-xs text-slate-500">
                {action.parameters?.length ? `${action.parameters.length} param(s)` : 'no params'}
              </span>
            </button>
            {isSelected && (
              <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <ParameterForm action={action} />
                <SubmitPanel action={action} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
