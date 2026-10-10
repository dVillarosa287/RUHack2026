import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/theme';
import { ForestIcon } from '@/lib/theme/SpriteIcon';
import { ForestGrid } from './ForestGrid';
import { ForestView } from './ForestView';

/** "#/forest/abc" opens forest abc. No hash shows all forests. */
function forestIdFromHash(): string | null {
  const match = window.location.hash.match(/^#\/forest\/(.+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function App() {
  const [forestId, setForestId] = useState(forestIdFromHash());

  useEffect(() => {
    const onChange = () => setForestId(forestIdFromHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-2xl font-bold text-primary"><ForestIcon icon="tree" size={36} />{APP_NAME}</a>
        {forestId && <a href="#" className="text-sm text-ink-muted underline">All forests</a>}
      </header>
      {forestId ? <ForestView forestId={forestId} /> : <ForestGrid />}
    </div>
  );
}
