import type { SpriteType } from '@/lib/storage';
import { COLORS, SPRITES, SPRITE_ORDER } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

/** A row of palette colors to pick from. `value` is a color id such as 'green'. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.name}
          aria-label={c.name}
          aria-pressed={c.id === value}
          onClick={() => onChange(c.id)}
          className={`h-6 w-6 rounded-full border-2 ${c.id === value ? 'border-ink' : 'border-transparent'}`}
          style={{ background: `var(--c-${c.id})` }}
        />
      ))}
    </div>
  );
}

/** A row of the five sprites to pick from, drawn in the chosen color. */
export function SpritePicker({ value, color, onChange }: { value: SpriteType; color: string; onChange: (type: SpriteType) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {SPRITE_ORDER.map((type) => (
        <button
          key={type}
          type="button"
          title={SPRITES[type].label}
          aria-pressed={type === value}
          onClick={() => onChange(type)}
          className={`rounded-lg border-2 p-1 ${type === value ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-primary-soft'}`}
        >
          <SpriteIcon type={type} size={28} color={color} />
        </button>
      ))}
    </div>
  );
}
