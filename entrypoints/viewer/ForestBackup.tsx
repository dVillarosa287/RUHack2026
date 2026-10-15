import { useRef, useState } from 'react';
import { exportForest, importForest, type Forest } from '@/lib/storage';
import { useWords } from '@/lib/theme';

const button = 'rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft disabled:opacity-60';

/** A file name made from the forest's name: "My Forest" becomes "My-Forest.wildernotes.json". */
const fileName = (name: string) => `${name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'forest'}.wildernotes.json`;

/**
 * "Export backup": downloads the whole forest (seeds, folders, roots, quizzes, screenshots) as one JSON file. The file
 * stays on the user's computer; settings and API keys are never in it. There is no cloud sync, so this is the
 * only way to keep a copy or move a forest to another computer.
 */
export function SaveBackupButton({ forest }: { forest: Forest }) {
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const blob = new Blob([JSON.stringify(await exportForest(forest.id))], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName(forest.name);
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className={button} disabled={busy} title="Download this forest as a file you can load back in later" onClick={() => void save()}>
      {busy ? 'Exporting…' : 'Export backup'}
    </button>
  );
}

/** Files bigger than this are refused, so a wrong file cannot freeze the page. Screenshots make real ones big. */
const MAX_BYTES = 200 * 1024 * 1024;

/** "Load backup": picks a backup file and adds its forest as a new one. Nothing already saved is changed. */
export function LoadBackupButton() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const words = useWords();

  const load = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_BYTES) throw new Error('This file is too big to be a forest backup.');
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error('This file is not a Wildernotes forest file.');
      }
      const forest = await importForest(data);
      setMessage(`Added the ${words.forest} "${forest.name}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      if (input.current) input.current.value = ''; // so the same file can be chosen again
    }
  };

  return (
    <>
      <button className={button} title={`Add a ${words.forest} from a backup file`} onClick={() => input.current?.click()}>
        Load backup
      </button>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void load(e.target.files?.[0])} />
      {message && <span className="text-sm text-ink-muted" role="status">{message}</span>}
    </>
  );
}
