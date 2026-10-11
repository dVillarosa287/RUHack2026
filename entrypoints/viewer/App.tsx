import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/theme';
import { ForestIcon } from '@/lib/theme/SpriteIcon';
import { ForestGrid } from './ForestGrid';
import { ForestView } from './ForestView';
import { GraphView } from './GraphView';
import { QuizView } from './QuizView';
import { SettingsPage } from './SettingsPage';
import { parseRoute, settingsHref } from './route';

export function App() {
  const [route, setRoute] = useState(parseRoute());

  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // The graph needs room, so its page is wider than the others.
  return (
    <div className={`mx-auto px-4 py-6 ${route.page === 'graph' ? 'max-w-7xl' : 'max-w-4xl'}`}>
      <header className="mb-6 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-2xl font-bold text-primary"><ForestIcon icon="tree" size={36} />{APP_NAME}</a>
        <nav className="flex gap-4 text-sm text-ink-muted">
          {route.page !== 'forests' && <a href="#" className="underline">All forests</a>}
          {route.page !== 'settings' && <a href={settingsHref} className="underline">Settings</a>}
        </nav>
      </header>
      {route.page === 'forests' && <ForestGrid />}
      {route.page === 'forest' && <ForestView forestId={route.forestId} />}
      {route.page === 'graph' && <GraphView forestId={route.forestId} />}
      {route.page === 'quiz' && <QuizView forestId={route.forestId} color={route.color} />}
      {route.page === 'settings' && <SettingsPage />}
    </div>
  );
}
