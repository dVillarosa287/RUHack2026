import type { ReactNode } from 'react';
import type { Forest } from '@/lib/storage';
import { ForestIcon } from '@/lib/theme/SpriteIcon';

/**
 * The top of a forest page: icon and name on the left, buttons on the right.
 * Pass the buttons as `actions`. The "Graph view" button goes there (see docs/SPEC.md, Forest viewer).
 */
export function ForestHeader({ forest, summary, actions }: { forest: Forest; summary: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold"><ForestIcon icon={forest.icon} size={40} />{forest.name}</h1>
        <p className="text-sm text-ink-muted">{summary}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
