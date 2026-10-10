import { useEffect, useState } from 'react';
import { onDataChanged } from '@/lib/storage';

/** Loads something from storage, and loads it again whenever storage changes (for example a new highlight). */
export function useStored<T>(load: () => Promise<T>, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let alive = true;
    const run = () => void load().then((v) => alive && setValue(v));
    run();
    const stop = onDataChanged(run);
    return () => {
      alive = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
