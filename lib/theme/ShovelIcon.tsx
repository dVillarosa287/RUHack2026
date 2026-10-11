import { shovelArt } from './index';
import { TintedArt } from './SpriteIcon';
import { useThemeId } from './themeId';

/**
 * The delete tool: the shovel art (in the Minimal theme an X, tinted in the theme's red), or a plain line drawing if
 * the image is missing.
 */
export function ShovelIcon({ size = 24 }: { size?: number }) {
  const { url, tint } = shovelArt(useThemeId());
  if (url && tint) return <span style={{ display: 'block', pointerEvents: 'none' }}><TintedArt url={url} tint="var(--c-red)" size={size} label="Shovel" /></span>;
  if (url) return <img src={url} alt="Shovel" width={size} height={size} draggable={false} style={{ display: 'block', pointerEvents: 'none' }} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Shovel" role="img">
      {/* Drawn pointing straight down, then turned 45 degrees: grip, handle, blade. */}
      <g transform="rotate(45 12 12)">
        <path d="M9 2.5 H15" />
        <path d="M12 2.5 V11" />
        <path d="M8 11 H16 V15 C16 18.5 12 21.5 12 21.5 C12 21.5 8 18.5 8 15 Z" />
      </g>
    </svg>
  );
}
