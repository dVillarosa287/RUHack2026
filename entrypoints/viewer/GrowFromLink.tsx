import { useEffect, useRef, useState } from 'react';
import { growFromLink } from '@/lib/ai';
import type { Seed } from '@/lib/storage';
import { countOf, useWords } from '@/lib/theme';
import { graphHref } from './route';

/**
 * The "Grow from link" button in a forest's header, left of "Graph view". The user pastes a link; Gemini reads that
 * page, plants its key ideas as seeds and grows roots from them to related seeds already in the forest (lib/ai).
 */
export function GrowFromLink({ forestId, seeds, showGraphLink }: { forestId: string; seeds: Seed[]; showGraphLink: boolean }) {
  const words = useWords();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [step, setStep] = useState(''); // what it is doing now; empty when idle
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  async function grow() {
    setError('');
    setDone('');
    try {
      const result = await growFromLink(forestId, address, seeds, setStep);
      setDone(`From “${result.title}”: ${countOf(result.seeds, words.seed, words.seeds)} and ${countOf(result.roots, words.root, words.roots)}.`);
      setAddress('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setStep('');
    }
  }

  return (
    <div className="relative">
      <button
        className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft"
        title="Paste a link: Gemini reads the page and connects its key ideas to this forest"
        onClick={() => setOpen((value) => !value)}
      >
        {words.fromLink}
      </button>
      {open && (
        <form
          className="absolute right-0 top-full z-20 mt-2 w-80 space-y-2 rounded-xl border-2 border-edge bg-surface p-3 shadow-md shadow-drop"
          onSubmit={(event) => {
            event.preventDefault();
            if (!step && address.trim()) void grow();
          }}
        >
          <input
            ref={input}
            type="url"
            className="w-full rounded-lg border border-edge bg-surface-alt p-2 text-sm"
            placeholder="https://…"
            value={address}
            disabled={!!step}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong disabled:opacity-60"
              disabled={!!step || !address.trim()}
            >
              {step || 'Read and connect'}
            </button>
            <button type="button" className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          {error && <p className="text-xs text-danger-soft" role="alert">{error}</p>}
          {done && (
            <p className="text-xs text-ink-muted">
              {done}{' '}
              {showGraphLink && <a href={graphHref(forestId)} className="text-primary underline">See them in the graph</a>}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
