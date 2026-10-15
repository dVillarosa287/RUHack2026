import { useState } from 'react';
import { DEFAULT_ADVANCED, getAdvancedSettings, updateAdvancedSettings, type AdvancedSettings as Advanced } from '@/lib/storage';
import { Dropdown } from './Dropdown';
import { useStored } from './useStored';

/** How often a creature visits, as a multiple of the normal chance. 0 turns it off. */
const RATES: [number, string][] = [
  [0, 'Never'],
  [0.5, 'Rarely'],
  [1, 'Normal'],
  [2, 'Often'],
  [4, 'Very often'],
];
const SIZES: [number, string][] = [
  [0.75, 'Small'],
  [1, 'Normal'],
  [1.3, 'Large'],
  [1.6, 'Very large'],
];
const REPEATS: [number, string][] = [
  [1, 'On'],
  [0, 'Off'],
];
const SPACING: [number, string][] = [
  [0.5, 'Shorter'],
  [1, 'Normal'],
  [2, 'Longer'],
];
const PLANT_SIZES: [number, string][] = [0.5, 0.7, 0.8, 0.9, 1, 1.2, 1.5, 2].map((n) => [n, `${Math.round(n * 100)}%`]);

/** One row: a label, a short help line, and a drop-down of choices. */
function Row({ label, help, value, choices, onChange }: { label: string; help: string; value: number; choices: [number, string][]; onChange(n: number): void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-ink-muted">{help}</p>
      </div>
      <Dropdown ariaLabel={label} className="w-40" value={String(value)} options={choices.map(([n, text]) => ({ value: String(n), label: text }))} onChange={(v) => onChange(Number(v))} />
    </div>
  );
}

/**
 * Advanced settings: things a user may want to tune or turn off, behind a button so the Settings page stays simple.
 * Saved in their own record (getAdvancedSettings in lib/storage). When you add something tunable, add a row here and
 * list it in CLAUDE.md under "Advanced settings".
 */
export function AdvancedSettings() {
  const [open, setOpen] = useState(false);
  const saved = useStored(getAdvancedSettings, []);
  const set = (patch: Partial<Advanced>) => void updateAdvancedSettings(patch);
  const a = saved ?? DEFAULT_ADVANCED;

  return (
    <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Advanced settings</h2>
        <button className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show advanced settings'}
        </button>
      </div>
      {open && (
        <>
          <Row label="Owl visits" help="How often an owl flies onto the page while the toolbar is open." value={a.owlRate} choices={RATES} onChange={(owlRate) => set({ owlRate })} />
          <Row label="Visiting owl size" help="How big the visiting owl is." value={a.owlScale} choices={SIZES} onChange={(owlScale) => set({ owlScale })} />
          <Row label="Frog visits" help="How often a frog jumps onto a lily pad." value={a.frogRate} choices={RATES} onChange={(frogRate) => set({ frogRate })} />
          <Row label="Frog size" help="How big the frog is next to its lily pad." value={a.frogScale} choices={SIZES} onChange={(frogScale) => set({ frogScale })} />
          <Row label="Default sprite size" help="The size new sprites are planted at. - and + still change it on the page." value={a.plantScale} choices={PLANT_SIZES} onChange={(plantScale) => set({ plantScale })} />
          <Row label="Review again later" help="After an apple's question, ask it again after 1, 3 and 7 days. A wrong answer starts over." value={a.reviewRepeats ? 1 : 0} choices={REPEATS} onChange={(n) => set({ reviewRepeats: n === 1 })} />
          <Row label="Time between reviews" help="Shorter halves the days between reviews, longer doubles them." value={a.reviewSpacing} choices={SPACING} onChange={(reviewSpacing) => set({ reviewSpacing })} />
          <button className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft" onClick={() => set(DEFAULT_ADVANCED)}>
            Reset to defaults
          </button>
        </>
      )}
    </section>
  );
}
