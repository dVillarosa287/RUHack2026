import type { SpriteType } from '@/lib/storage';
import { SPRITES, forestIconSprite, forestIconUrl, spriteColorVar, spriteImageUrl, spriteLabel, spriteNeedsTint } from './index';
import { useThemeId } from './themeId';

interface SpriteIconProps {
  type: SpriteType;
  size?: number;
  /** Show the grown form (growth `tree`), if the sprite has one. */
  grown?: boolean;
}

/**
 * Draws a sprite in the chosen theme (its art and color change with the theme). Most art is colored already and is
 * drawn as it is. White placeholder art ("uncolored-*" and all the Minimal theme's shapes) is tinted, see TintedArt.
 * Falls back to an emoji if the image is missing.
 */
export function SpriteIcon({ type, size = 24, grown = false }: SpriteIconProps) {
  const themeId = useThemeId();
  const url = spriteImageUrl(type, grown, themeId);
  const label = spriteLabel(type, themeId);
  if (!url) {
    return (
      <span role="img" aria-label={label} style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        {SPRITES[type].emoji}
      </span>
    );
  }
  const tint = spriteNeedsTint(type, grown, themeId) ? spriteColorVar(type, grown) : null;
  return <TintedArt url={url} tint={tint} size={size} label={label} />;
}

/**
 * Draws one image, tinted if `tint` is a color. White art is a black outline with a white fill: a layer in the
 * color is cut to the art's shape (a mask) and the art is multiplied onto it, so white becomes the color and black
 * stays black.
 */
export function TintedArt({ url, tint, size, label }: { url: string; tint: string | null; size: number; label?: string }) {
  const shape = `url("${url}")`;
  return (
    <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0, isolation: 'isolate' }}>
      {tint && (
        <span
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, background: tint, WebkitMaskImage: shape, maskImage: shape, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
        />
      )}
      <img src={url} alt="" width={size} height={size} draggable={false} style={{ position: 'relative', display: 'block', mixBlendMode: tint ? 'multiply' : 'normal', pointerEvents: 'none' }} />
    </span>
  );
}

/** A forest's icon: its art (in the Minimal theme, the matching sprite's shape), or the text itself (an emoji) if it has no art. */
export function ForestIcon({ icon, size = 24 }: { icon: string; size?: number }) {
  const themeId = useThemeId();
  const sprite = forestIconSprite(icon, themeId);
  if (sprite) return <SpriteIcon type={sprite.type} grown={sprite.grown} size={size} />;
  const url = forestIconUrl(icon, themeId);
  if (url) return <img src={url} alt="" width={size} height={size} draggable={false} style={{ display: 'inline-block', flexShrink: 0 }} />;
  return <span aria-hidden="true" style={{ fontSize: size * 0.8, lineHeight: 1 }}>{icon}</span>;
}
