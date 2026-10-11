import { useState } from 'react';
import type { SpriteType } from '@/lib/storage';
import { DEFAULT_COLOR_ID } from '@/lib/theme';
import { ColorPicker, SpritePicker } from './Pickers';

/** A small form for a text note: a seed that did not come from a web page. The graph decides where it goes. */
export function NewNoteForm({ onPlant, onCancel }: { onPlant: (note: { spriteType: SpriteType; color: string; text: string }) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [spriteType, setSpriteType] = useState<SpriteType>('sprout');
  const [color, setColor] = useState(DEFAULT_COLOR_ID);

  return (
    <form
      className="w-72 space-y-3 rounded-xl border-2 border-edge bg-surface p-3 shadow-md shadow-drop"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onPlant({ spriteType, color, text: text.trim() });
      }}
    >
      <p className="font-semibold">New text note</p>
      <textarea autoFocus className="h-24 w-full rounded-lg border border-edge bg-surface-alt p-2 text-sm" placeholder="Write your note…" value={text} onChange={(e) => setText(e.target.value)} />
      <SpritePicker value={spriteType} color={color} onChange={setSpriteType} />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-lg border border-edge px-3 py-1 text-sm hover:bg-primary-soft" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={!text.trim()} className="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-primary-ink hover:bg-primary-strong disabled:opacity-50">Plant note</button>
      </div>
    </form>
  );
}
