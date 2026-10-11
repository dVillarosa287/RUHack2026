import { useEffect, useState } from 'react';
import { getScreenshot } from '@/lib/storage';

/** A lily pad's screenshot, loaded from storage. Shows nothing if the seed has none. */
export function Screenshot({ seedId, className = '' }: { seedId: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getScreenshot(seedId).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [seedId]);
  if (!src) return null;
  return <img src={src} alt="Screenshot saved with this lily pad" className={`rounded-lg border border-edge ${className}`} />;
}
