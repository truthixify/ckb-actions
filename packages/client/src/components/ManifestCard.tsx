import { Zap } from 'lucide-react';
import { useState } from 'react';
import { hostOf } from '../lib/utils';
import { useActionStore } from '../lib/store';
import { ActionList } from './ActionList';
import { DomainTag, NetworkBadge } from './ds/Badge';
import { Card, Divider } from './ds/Card';

export function ManifestCard() {
  const { manifest, url } = useActionStore();
  const [iconBroken, setIconBroken] = useState(false);
  if (!manifest) return null;

  return (
    <div className="flex flex-col gap-6">
      <DomainTag domain={hostOf(url)} trusted={false} />

      <Card variant="review" padding="primary" className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[var(--color-bg-inset)] border border-[var(--color-border-hairline)] flex items-center justify-center shrink-0 overflow-hidden">
            {iconBroken ? (
              <Zap size={20} strokeWidth={1.5} className="text-[var(--color-accent)]" aria-hidden />
            ) : (
              <img
                src={manifest.icon}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setIconBroken(true)}
              />
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <h1 className="text-heading-2">{manifest.title}</h1>
            <p className="text-body text-[var(--color-text-secondary)]">{manifest.description}</p>
          </div>
        </div>

        <Divider />

        <ActionList />
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-body-sm text-[var(--color-text-muted)]">Network</span>
        <NetworkBadge network={manifest.network} />
      </div>
    </div>
  );
}
