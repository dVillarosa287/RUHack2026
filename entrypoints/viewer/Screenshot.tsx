import { useEffect, useState } from 'react';
import { getScreenshot } from '@/lib/storage';

/**
 * A media seed's screenshot, loaded from storage. Shows nothing if the seed has none. The picture is saved a
 * moment after its seed, so if it is not there yet this looks again a few times.
 */
export function Screenshot({ seedId, className = '' }: { seedId: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const load = async (triesLeft: number) => {
      const found = await getScreenshot(seedId);
      if (!alive) return;
      if (found) setSrc(found);
      else if (triesLeft > 0) timer = window.setTimeout(() => void load(triesLeft - 1), 1000);
    };
    void load(5);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [seedId]);
  if (!src) return null;
  return <img src={src} alt="Screenshot saved with this seed" className={`rounded-lg border border-edge ${className}`} />;
}
