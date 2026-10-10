import type { SpriteType } from '@/lib/storage';
import { SPRITES, spriteImageUrl } from './index';

/** Draws a sprite: the real art if the theme has it, otherwise the emoji stand-in. */
export function SpriteIcon({ type, size = 24 }: { type: SpriteType; size?: number }) {
  const image = spriteImageUrl(type);
  if (image) {
    return <img src={image} alt={SPRITES[type].label} width={size} height={size} draggable={false} />;
  }
  return (
    <span role="img" aria-label={SPRITES[type].label} style={{ fontSize: size * 0.8, lineHeight: 1 }}>
      {SPRITES[type].emoji}
    </span>
  );
}
