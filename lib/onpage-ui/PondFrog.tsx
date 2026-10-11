import { useEffect, useRef } from 'react';
import { createLineBoil } from '@/lib/engine';
import type { Seed } from '@/lib/storage';
import { artUrl, useThemeId, useWords } from '@/lib/theme';

const FROG_SITTING = artUrl('frogsit.png');
const FROG_JUMPING = artUrl('frogjump.png');

// How often the frog rolls the dice, and its chances each time. Raise the chances to see it sooner in a demo.
const CHECK_EVERY_MS = 4000;
/** Chance that a frog jumps in from off screen, when a lily pad is on screen and there is no frog yet. */
const ARRIVE_CHANCE = 0.2;
/** Chance that a sitting frog hops to another lily pad on screen and close by. */
const HOP_CHANCE = 0.3;
/** How close (in px) another lily pad must be for the frog to hop to it. */
const NEAR_PX = 450;
const ARRIVE_MS = 900;
const HOP_MS = 600;

interface Spot {
  x: number;
  y: number;
  /** The lily pad's width, so the frog matches the pad's size (- and +). */
  size: number;
}

/** The frog. `from` is set while it is in the air; it lands on `padId`, which it then follows. */
interface Frog {
  padId: string;
  from: { x: number; y: number } | null;
  start: number;
  duration: number;
  arc: number;
}

/**
 * Now and then a frog jumps in from off screen onto a lily pad and sits there. If another lily pad is on screen and
 * close by, it may hop over to that one. At most one frog per page; nothing is saved.
 *
 * The frog never asks the page where the text is: it reads where MarkerLayer drew the lily pad's sprite
 * (`data-seed-id`) on every frame, so it moves with the pad when the page scrolls or reflows.
 * It wobbles with the same line boil as the markers. Not in the Minimal theme (its lily pad is a triangle), and not when the user asks for reduced motion.
 */
export function PondFrog({ seeds }: { seeds: Seed[] }) {
  const themeId = useThemeId();
  const { frogAlt } = useWords();
  const box = useRef<HTMLDivElement>(null);
  const sitImg = useRef<HTMLImageElement>(null);
  const jumpImg = useRef<HTMLImageElement>(null);
  const padIds = useRef<string[]>([]);
  padIds.current = seeds.filter((seed) => seed.spriteType === 'lilypad' && seed.kind === 'highlight').map((seed) => seed.id);
  const hasPads = padIds.current.length > 0;
  const enabled = hasPads && themeId !== 'minimal' && FROG_SITTING !== null && FROG_JUMPING !== null;

  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = el.getRootNode() as ShadowRoot | Document;
    let frog: Frog | null = null;

    // Where a frog sits on this lily pad right now: a bit below the middle of its sprite. Null if it is not drawn.
    const padSpot = (id: string): Spot | null => {
      const marker = root.querySelector<HTMLElement>(`.fo-marker[data-seed-id="${id}"]`);
      if (!marker || marker.style.visibility === 'hidden') return null;
      const rect = marker.getBoundingClientRect();
      if (rect.width === 0) return null;
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.65, size: rect.width };
    };
    const onScreen = (spot: Spot) => spot.x >= 0 && spot.x <= window.innerWidth && spot.y >= 0 && spot.y <= window.innerHeight;
    const padsOnScreen = () =>
      padIds.current.flatMap((id) => {
        const spot = padSpot(id);
        return spot && onScreen(spot) ? [{ id, spot }] : [];
      });
    // Only called with a list that has something in it.
    const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;

    const roll = () => {
      if (document.hidden) return;
      if (!frog) {
        const pads = padsOnScreen();
        if (pads.length === 0 || Math.random() >= ARRIVE_CHANCE) return;
        const { id, spot } = pick(pads);
        // It comes in from the nearer side of the window, a little above or below the pad.
        const fromLeft = spot.x < window.innerWidth / 2;
        const from = { x: fromLeft ? -spot.size : window.innerWidth + spot.size, y: spot.y + (Math.random() * 160 - 100) };
        frog = { padId: id, from, start: performance.now(), duration: ARRIVE_MS, arc: 120 };
        return;
      }
      if (frog.from) return; // still in the air
      const here = padSpot(frog.padId);
      if (!here || !onScreen(here) || Math.random() >= HOP_CHANCE) return;
      const near = padsOnScreen().filter(({ id, spot }) => id !== frog!.padId && Math.hypot(spot.x - here.x, spot.y - here.y) <= NEAR_PX);
      if (near.length === 0) return;
      const next = pick(near);
      const distance = Math.hypot(next.spot.x - here.x, next.spot.y - here.y);
      frog = { padId: next.id, from: { x: here.x, y: here.y }, start: performance.now(), duration: HOP_MS, arc: 40 + distance * 0.2 };
    };

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (frog && !padIds.current.includes(frog.padId)) frog = null; // its lily pad was dug up
      const spot = frog ? padSpot(frog.padId) : null;
      if (!frog || !spot) {
        el.style.visibility = 'hidden';
        return;
      }
      let { x, y } = spot;
      let flying = false;
      if (frog.from) {
        const t = Math.min(1, (performance.now() - frog.start) / frog.duration);
        // Straight towards the pad (which may be moving), plus an arc up and back down.
        x = frog.from.x + (spot.x - frog.from.x) * t;
        y = frog.from.y + (spot.y - frog.from.y) * t - frog.arc * 4 * t * (1 - t);
        flying = t < 1;
        // The jumping art faces right, so it is mirrored when the frog jumps to the left.
        if (jumpImg.current) jumpImg.current.style.scale = spot.x < frog.from.x ? '-1 1' : '1 1';
        if (!flying) frog.from = null;
      }
      if (sitImg.current) sitImg.current.style.display = flying ? 'none' : 'block';
      if (jumpImg.current) jumpImg.current.style.display = flying ? 'block' : 'none';
      // Spots are on the screen; the frog is placed inside the UI host, so subtract where the host's corner is. That
      // is right whether the host is fixed to the screen or sits at the top of the page and scrolls with it.
      const host = root instanceof ShadowRoot ? root.host.getBoundingClientRect() : { left: 0, top: 0 };
      el.style.width = `${Math.round(spot.size * 0.9)}px`;
      el.style.transform = `translate(${Math.round(x - host.left)}px, ${Math.round(y - host.top)}px)`;
      el.style.visibility = 'visible';
    };
    frame = requestAnimationFrame(tick);
    const timer = window.setInterval(roll, CHECK_EVERY_MS);
    // The same wobbly outline as the sprites on the page (MarkerLayer), so the frog looks hand drawn too.
    const stopBoil = createLineBoil([el], root);
    return () => {
      stopBoil();
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      el.style.visibility = 'hidden';
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={box} className="fo-pond-frog" style={{ visibility: 'hidden' }} aria-hidden="true">
      <img ref={sitImg} src={FROG_SITTING!} alt={frogAlt} />
      <img ref={jumpImg} src={FROG_JUMPING!} alt="" style={{ display: 'none' }} />
    </div>
  );
}
