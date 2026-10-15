import type { Seed } from '@/lib/storage';
import { useWords } from '@/lib/theme';

/**
 * Whether a seed matches the search: every word typed must appear somewhere in its text, note, label, page title or
 * address, ignoring case. An empty search matches everything.
 */
export function seedMatches(seed: Seed, query: string): boolean {
  const haystack = [seed.text, seed.note, seed.displayText, seed.pageTitle, seed.url].join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

/** The search box inside one forest (list and graph view). Esc clears it. */
export function SeedSearch({ value, onChange, className = '' }: { value: string; onChange(value: string): void; className?: string }) {
  const words = useWords();
  return (
    <input
      type="search"
      aria-label={`Search ${words.seeds}`}
      placeholder={`Search ${words.seeds}…`}
      className={`w-56 rounded-lg border border-edge bg-surface-alt px-2 py-1.5 text-sm ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Escape' && onChange('')}
    />
  );
}
