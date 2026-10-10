import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/theme';
import { ForestIcon } from '@/lib/theme/SpriteIcon';
import { ForestGrid } from './ForestGrid';
import { ForestView } from './ForestView';
import { GraphView } from './GraphView';
import { SettingsPage } from './SettingsPage';
import { parseRoute } from './route';

export function App() {
  const [route, setRoute] = useState(parseRoute());

  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-2xl font-bold text-primary"><ForestIcon icon="tree" size={36} />{APP_NAME}</a>
        {route.page !== 'forests' && <a href="#" className="text-sm text-ink-muted underline">All forests</a>}
      </header>
      {route.page === 'forests' && <ForestGrid />}
      {route.page === 'forest' && <ForestView forestId={route.forestId} />}
      {route.page === 'graph' && <GraphView forestId={route.forestId} />}
      {route.page === 'settings' && <SettingsPage />}
    </div>
  );
}
