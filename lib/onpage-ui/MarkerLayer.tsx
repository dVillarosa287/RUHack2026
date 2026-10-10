import { useEffect, useState } from 'react';
import type { Seed } from '@/lib/storage';
import { resolvePoint } from '@/lib/engine';
import { colorHex } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

/** Counts up whenever the page layout may have changed, so markers re-measure their spot. */
function useLayoutTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('resize', bump);
    window.addEventListener('load', bump);
    const observer = new ResizeObserver(bump);
    observer.observe(document.documentElement);
    // Images and fonts keep shifting the layout for a few seconds after load.
    const timers = [500, 1500, 3000, 6000].map((ms) => window.setTimeout(bump, ms));
    return () => {
      window.removeEventListener('resize', bump);
      window.removeEventListener('load', bump);
      observer.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, []);
  return tick;
}

interface MarkerLayerProps {
  seeds: Seed[];
  digging: boolean;
  flashId: string | null;
  onDig(seedId: string): void;
}

export function MarkerLayer({ seeds, digging, flashId, onDig }: MarkerLayerProps) {
  useLayoutTick();
  return (
    <>
      {seeds
        .filter((s) => s.kind === 'sprite' && s.anchor)
        .map((seed) => {
          const point = resolvePoint(seed.anchor!);
          if (!point) return null;
          return (
            <div
              key={seed.id}
              className={`fo-marker${digging ? ' fo-dig' : ''}${flashId === seed.id ? ' fo-flash' : ''}`}
              style={{ left: point.x, top: point.y, background: colorHex(seed.color) }}
              title={seed.text}
              onClick={digging ? () => onDig(seed.id) : undefined}
            >
              <SpriteIcon type={seed.spriteType} size={16} />
            </div>
          );
        })}
    </>
  );
}
