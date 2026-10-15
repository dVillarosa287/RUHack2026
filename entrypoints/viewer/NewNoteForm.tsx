import { useState } from 'react';
import type { SpriteType } from '@/lib/storage';
import { TEXT_ONLY_SPRITES, spriteColorKey, useWords } from '@/lib/theme';
import { SpritePicker } from './Pickers';

/** A small form for a text note: a seed that did not come from a web page. The graph decides where it goes. */
export function NewNoteForm({ onPlant, onCancel }: { onPlant: (note: { spriteType: SpriteType; color: string; text: string }) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [spriteType, setSpriteType] = useState<SpriteType>('sprout');
  const words = useWords(); // "Add note" in every theme

  return (
    <form
      className="w-72 space-y-3 rounded-xl border-2 border-edge bg-surface p-3 shadow-md shadow-drop"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onPlant({ spriteType, color: spriteColorKey(spriteType), text: text.trim() }); // each sprite has its own color
      }}
    >
      <p className="font-semibold">New text note</p>
      <textarea autoFocus className="h-24 w-full rounded-lg border border-edge bg-surface-alt p-2 text-sm" placeholder="Write your note…" value={text} onChange={(e) => setText(e.target.value)} />
      {/* The lily pad and the apple only go on page text, and a note has none. */}
      <SpritePicker value={spriteType} onChange={setSpriteType} exclude={TEXT_ONLY_SPRITES} />
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-lg border border-edge px-3 py-1 text-sm hover:bg-primary-soft" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={!text.trim()} className="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-primary-ink hover:bg-primary-strong disabled:opacity-50">{words.plantNote}</button>
      </div>
    </form>
  );
}
