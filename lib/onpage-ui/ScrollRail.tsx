import { useEffect, useMemo, useRef, useState } from 'react';
import { MarkerTracker } from '@/lib/engine';
import type { Anchor, Seed } from '@/lib/storage';
import { artUrl } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

interface ScrollRailProps {
  /** The current forest's seeds on this page. */
  seeds: Seed[];
  /** Scroll to a seed and light it up. */
  onJump(seedId: string): void;
}

interface Stop {
  seed: Seed;
  /** How far down the page the seed is, from 0 (top) to 1 (bottom). */
  fraction: number;
}

const SPRITE_SIZE = 26; // bigger than the 10px bar on purpose: the sprites stick out past it
const MEASURE_EVERY_MS = 500;
/** In case the browser sends no "scrollend" (it is already where it should be), the animal goes after this long. */
const ANIMAL_LEAVES_AFTER_MS = 1500;
/** The artist's file for the animal. Until it is in images/ and named here, a plain circle stands in. */
const ANIMAL_ART = 'uncolored-animal.png';

const pageHeight = () => Math.max(1, document.documentElement.scrollHeight);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * A slim bar down the left edge of the window, standing for the whole page. Every seed on the page is a small
 * sprite on it, at the same height as the seed is down the page. Clicking one scrolls there. When you jump, the
 * rail remembers where you were as "the animal"; clicking the animal takes you back.
 */
export function ScrollRail({ seeds, onJump }: ScrollRailProps) {
  const located = useMemo(() => seeds.filter((s): s is Seed & { anchor: Anchor } => s.anchor !== null), [seeds]);
  const trackers = useRef(new Map<string, { anchor: Anchor; tracker: MarkerTracker }>());
  const [stops, setStops] = useState<Stop[]>([]);
  // Where the page was scrolled to (px) before the last jump, or null if there has not been one.
  const [animalAt, setAnimalAt] = useState<number | null>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // The shaded block that shows which part of the page is on screen. It is moved directly, not through React.
  useEffect(() => {
    const place = () => {
      const el = thumbRef.current;
      if (!el) return;
      const height = pageHeight();
      el.style.top = `${clamp01(window.scrollY / height) * 100}%`;
      el.style.height = `${clamp01(window.innerHeight / height) * 100}%`;
    };
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    const timer = window.setInterval(place, MEASURE_EVERY_MS); // the page can grow as it loads
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
      window.clearInterval(timer);
    };
  }, []);

  // Where each seed is on the page. Asked again every half second, because pages move as they load.
  useEffect(() => {
    const measure = () => {
      const height = pageHeight();
      const next = located.map((seed) => {
        let entry = trackers.current.get(seed.id);
        if (!entry || entry.anchor !== seed.anchor) {
          entry = { anchor: seed.anchor, tracker: new MarkerTracker(seed.anchor) };
          trackers.current.set(seed.id, entry);
        }
        const fraction = Math.round(clamp01((entry.tracker.position().y + window.scrollY) / height) * 1000) / 1000;
        return { seed, fraction };
      });
      setStops((prev) => (prev.length === next.length && prev.every((p, i) => p.seed === next[i]?.seed && p.fraction === next[i]?.fraction) ? prev : next));
    };
    measure();
    const timer = window.setInterval(measure, MEASURE_EVERY_MS);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
    };
  }, [located]);

  if (located.length === 0) return null;

  const jump = (seedId: string) => {
    setAnimalAt(window.scrollY);
    onJump(seedId);
  };
  const goBack = () => {
    if (animalAt === null) return;
    window.scrollTo({ top: animalAt, behavior: 'smooth' });
    // Taking the clicked button off the page while the page is still scrolling stops the scroll, so the animal
    // waits until the scroll has finished.
    const done = () => {
      window.removeEventListener('scrollend', done);
      window.clearTimeout(fallback);
      setAnimalAt(null);
    };
    const fallback = window.setTimeout(done, ANIMAL_LEAVES_AFTER_MS);
    window.addEventListener('scrollend', done);
  };
  const animalArt = artUrl(ANIMAL_ART);
  // The animal sits where you were looking, which is about a third of the way down the window.
  const animalFraction = animalAt === null ? 0 : clamp01((animalAt + window.innerHeight / 3) / pageHeight());

  return (
    <div className="fo-rail">
      <div ref={thumbRef} className="fo-rail-thumb" />
      {stops.map(({ seed, fraction }) => (
        <button key={seed.id} className="fo-rail-stop" style={{ top: `${fraction * 100}%` }} title={seed.text || seed.pageTitle} onClick={() => jump(seed.id)}>
          <SpriteIcon type={seed.spriteType} size={SPRITE_SIZE} grown={seed.growth === 'tree'} />
        </button>
      ))}
      {animalAt !== null && (
        <button className="fo-rail-stop fo-rail-animal" style={{ top: `${animalFraction * 100}%` }} title="Go back to where you were" onClick={goBack}>
          {animalArt ? <img src={animalArt} alt="" width={SPRITE_SIZE} height={SPRITE_SIZE} /> : <span className="fo-rail-animal-stand-in" />}
        </button>
      )}
    </div>
  );
}
