import { useState } from 'react';
import { getFolders, getForest, getSeedsForForest } from '@/lib/storage';
import { countOf, useWords } from '@/lib/theme';
import { FolderSidebar, isUnfiled, type FolderChoice } from './FolderSidebar';
import { ForestHeader } from './ForestHeader';
import { ForestList } from './ForestList';
import { GrowFromLink } from './GrowFromLink';
import { QuizBar } from './QuizBar';
import { graphHref } from './route';
import { useStored } from './useStored';

/**
 * A forest as a list of its annotations. This file is only the layout, so several people can work on the pieces
 * at once: the header (ForestHeader, with the "Graph view" button on the right), the folder sidebar on the left
 * (FolderSidebar), and the list itself (ForestList), and the quiz buttons (QuizBar).
 */
export function ForestView({ forestId }: { forestId: string }) {
  const data = useStored(async () => ({ forest: await getForest(forestId), seeds: await getSeedsForForest(forestId), folders: await getFolders(forestId) }), [forestId]);
  const [folder, setFolder] = useState<FolderChoice>('all');
  const words = useWords(); // "seeds" or "items", by theme

  if (!data) return <p>Loading…</p>;
  if (!data.forest) return <p>This {words.forest} no longer exists.</p>;

  // Text notes have no page, so they are not counted as one.
  const pageCount = new Set(data.seeds.map((s) => s.url).filter(Boolean)).size;
  const summary = `${countOf(data.seeds.length, words.seed, words.seeds)} on ${countOf(pageCount, 'page', 'pages')}`;

  const shown = folder === 'all' ? data.seeds : folder === 'none' ? data.seeds.filter((s) => isUnfiled(s, data.folders)) : data.seeds.filter((s) => s.folderId === folder);

  return (
    <>
      <ForestHeader
        forest={data.forest}
        summary={summary}
        actions={
          <>
            <GrowFromLink forestId={forestId} seeds={data.seeds} showGraphLink />
            <a href={graphHref(forestId)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong">Graph view</a>
          </>
        }
      />
      <QuizBar forestId={forestId} seeds={data.seeds} />
      <div className="flex gap-6">
        <FolderSidebar forestId={forestId} folders={data.folders} seeds={data.seeds} choice={folder} onChoose={setFolder} />
        <div className="min-w-0 flex-1">
          <ForestList seeds={shown} emptyText={folder === 'all' ? undefined : `No ${words.seeds} here. Drag ${words.aSeed} from "All ${words.seeds}" onto a ${words.folder} to move it.`} />
        </div>
      </div>
    </>
  );
}
