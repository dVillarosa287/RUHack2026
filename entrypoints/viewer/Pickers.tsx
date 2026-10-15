import type { SpriteType } from '@/lib/storage';
import { SPRITE_ORDER, spriteLabel, useThemeId } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

/** A row of the sprites to pick from, without any in `exclude`. Each sprite has its own color, so there is no color to choose. */
export function SpritePicker({ value, onChange, exclude = [] }: { value: SpriteType; onChange: (type: SpriteType) => void; exclude?: SpriteType[] }) {
  const themeId = useThemeId(); // names follow the theme (Minimal calls the flower a star)
  return (
    <div className="flex flex-wrap gap-1">
      {SPRITE_ORDER.filter((type) => !exclude.includes(type)).map((type) => (
        <button
          key={type}
          type="button"
          title={spriteLabel(type, themeId)}
          aria-pressed={type === value}
          onClick={() => onChange(type)}
          className={`rounded-lg border-2 p-1 ${type === value ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-primary-soft'}`}
        >
          <SpriteIcon type={type} size={28} />
        </button>
      ))}
    </div>
  );
}
