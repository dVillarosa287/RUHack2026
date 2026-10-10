import type { SpriteType } from '@/lib/storage';
import { SPRITES, forestIconUrl, spriteImageUrl } from './index';

interface SpriteIconProps {
  type: SpriteType;
  size?: number;
  /** A palette color id, for example 'green'. Without it the sprite is drawn as it is (white fill). */
  color?: string;
  /** Show the grown form (growth `tree`), if the sprite has one. */
  grown?: boolean;
}

/**
 * Draws a sprite. The art is a black outline with a white fill. To color it, a layer in the palette color is cut
 * to the sprite's shape (a mask) and the art is multiplied onto it: white becomes the color, black stays black.
 * Falls back to an emoji if the image is missing.
 */
export function SpriteIcon({ type, size = 24, color, grown = false }: SpriteIconProps) {
  const url = spriteImageUrl(type, grown);
  if (!url) {
    return (
      <span role="img" aria-label={SPRITES[type].label} style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        {SPRITES[type].emoji}
      </span>
    );
  }
  const shape = `url("${url}")`;
  return (
    <span role="img" aria-label={SPRITES[type].label} style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0, isolation: 'isolate' }}>
      {color && (
        <span
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, background: `var(--c-${color})`, WebkitMaskImage: shape, maskImage: shape, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
        />
      )}
      <img src={url} alt="" width={size} height={size} draggable={false} style={{ position: 'relative', display: 'block', mixBlendMode: color ? 'multiply' : 'normal', pointerEvents: 'none' }} />
    </span>
  );
}

/** A forest's icon: its art, or the text itself (an emoji) if it has no art. */
export function ForestIcon({ icon, size = 24 }: { icon: string; size?: number }) {
  const url = forestIconUrl(icon);
  if (url) return <img src={url} alt="" width={size} height={size} draggable={false} style={{ display: 'inline-block', flexShrink: 0 }} />;
  return <span aria-hidden="true" style={{ fontSize: size * 0.8, lineHeight: 1 }}>{icon}</span>;
}
