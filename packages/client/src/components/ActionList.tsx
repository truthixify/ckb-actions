import { Fragment } from 'react';
import { cn } from '../lib/utils';
import { useActionStore } from '../lib/store';
import { Button } from './ds/Button';
import { Card } from './ds/Card';
import { ParameterForm } from './ParameterForm';
import { SubmitPanel } from './SubmitPanel';

export function ActionList() {
  const { manifest, selectedAction, selectAction } = useActionStore();
  if (!manifest) return null;

  return (
    <div className="flex flex-col gap-3">
      {manifest.links.actions.map((action, idx) => {
        const isSelected = selectedAction === action;
        const isPrimary = idx === 0;
        return (
          <Fragment key={`${action.label}-${idx}`}>
            <Button
              variant={isPrimary ? 'primary' : 'secondary'}
              size="lg"
              fullWidth
              onClick={() => selectAction(isSelected ? null : action)}
              className={cn('justify-between', isSelected && 'border border-[var(--color-accent)]')}
            >
              <span>{action.label}</span>
              <span className="text-label text-[var(--color-text-secondary)] opacity-70">
                {action.parameters?.length
                  ? `${action.parameters.length} param${action.parameters.length === 1 ? '' : 's'}`
                  : 'no params'}
              </span>
            </Button>
            {isSelected && (
              <Card variant="inset" padding="default" className="flex flex-col gap-4">
                {action.parameters && action.parameters.length > 0 && (
                  <ParameterForm action={action} />
                )}
                <SubmitPanel action={action} />
              </Card>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
