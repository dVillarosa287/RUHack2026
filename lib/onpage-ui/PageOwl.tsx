import { useEffect, useRef } from 'react';
import { createLineBoil } from '@/lib/engine';
import { owlArt, useThemeId } from '@/lib/theme';

// How often the owl rolls the dice, and its chances each time. Raise the chances to see it sooner in a demo.
const CHECK_EVERY_MS = 5000;
/** Chance that an owl flies down from above the window, when there is no owl yet. */
const ARRIVE_CHANCE = 0.15;
/** Chance that a sitting owl moves: half the time to another perch on screen, half the time away off the top. */
const MOVE_CHANCE = 0.2;
const ARRIVE_MS = 1400;
const LEAVE_MS = 1100;
/** Width of the owl in px (the sprites on the page are 38). */
const OWL_SIZE = 46;
/** Which way the head points in owlfly.png, in degrees (0 is right, 90 is down): down and to the left. */
const FLY_ART_HEADING = 125;
/** What the owl sits on: buttons, or the top of a block of text. */
const BUTTONS = 'button, [role="button"], input[type="submit"], input[type="button"]';
const TEXT = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption';

interface Point {
  x: number;
  y: number;
}

/** Where the owl's feet go: an element on the page, plus an offset from its top left corner. */
interface Perch {
  el: Element;
  dx: number;
  dy: number;
}

/** The owl. `from` is set while it is flying; it flies to `perch`, or off the top of the window to `away`. */
interface Owl {
  perch: Perch | null;
  away: Point | null;
  from: Point | null;
  kind: 'arrive' | 'hop' | 'leave';
  start: number;
  duration: number;
}

/**
 * Now and then an owl flies down from above the window and sits on top of a button or on the first line of a block
 * of text (a paragraph, heading or list item). While it sits it may fly to another perch on screen, or fly away again.
 * At most one owl per page; nothing is saved. Only while the toolbar is open, and not when the user asks for reduced motion.
 *
 * Like the frog (PondFrog.tsx) it reads where its perch is on every frame, so it moves with the page when it scrolls
 * or reflows. If its perch scrolls off screen or is removed, the owl is gone, and a new one can come later.
 * Flying uses owlfly.png, mirrored and turned to face where it is going; sitting uses the plain owl.png. The art
 * depends on the theme (owlArt in lib/theme).
 */
export function PageOwl() {
  const themeId = useThemeId();
  const art = owlArt(themeId);
  const box = useRef<HTMLDivElement>(null);
  const sitImg = useRef<HTMLImageElement>(null);
  const flyImg = useRef<HTMLImageElement>(null);
  const enabled = art.sit !== null && art.fly !== null;

  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = el.getRootNode() as ShadowRoot | Document;
    let owl: Owl | null = null;

    const perchSpot = (perch: Perch): Point | null => {
      if (!perch.el.isConnected) return null;
      const rect = perch.el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;
      return { x: rect.left + perch.dx, y: rect.top + perch.dy };
    };
    const onScreen = (spot: Point) => spot.x >= 0 && spot.x <= window.innerWidth && spot.y >= 0 && spot.y <= window.innerHeight;
    // Only called with a list that has something in it.
    const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;

    // A perch on this element, or null if it is too small or covered. A button: the middle of its top edge. Text: a
    // random spot on top of its first line, so the owl sits on the words and not on empty space beside them.
    const perchOn = (target: Element): Perch | null => {
      const rect = target.getBoundingClientRect();
      let dx = rect.width / 2;
      let dy = 0;
      if (target.matches(TEXT)) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const line = Array.from(range.getClientRects()).find((r) => r.width >= OWL_SIZE);
        if (!line) return null;
        dx = line.left - rect.left + OWL_SIZE / 2 + Math.random() * (line.width - OWL_SIZE);
        dy = line.top - rect.top + 3; // a little into the line, so its feet touch the letters
      }
      const spot = { x: rect.left + dx, y: rect.top + dy };
      // Skip it if something else (a sticky header, a pop-up, one of our sprites) is drawn over that spot.
      const hit = document.elementFromPoint(spot.x, spot.y + 4);
      return hit && target.contains(hit) ? { el: target, dx, dy } : null;
    };

    // A few perches on screen, with room above them for the owl.
    const findPerch = (except?: Element): Perch | null => {
      const candidates = Array.from(document.querySelectorAll(`${BUTTONS}, ${TEXT}`)).filter((target) => {
        if (target === except) return false;
        const rect = target.getBoundingClientRect();
        if (rect.width < 24 || rect.top < OWL_SIZE * 1.3 || rect.top > window.innerHeight - 20) return false;
        if (rect.left < 0 || rect.right > window.innerWidth) return false;
        return target.matches(BUTTONS) || (target.textContent ?? '').trim().length >= 20;
      });
      for (let tries = 0; tries < 10 && candidates.length > 0; tries++) {
        const perch = perchOn(pick(candidates));
        if (perch) return perch;
      }
      return null;
    };

    const roll = () => {
      if (document.hidden) return;
      if (!owl) {
        if (Math.random() >= ARRIVE_CHANCE) return;
        const perch = findPerch();
        const spot = perch && perchSpot(perch);
        if (!perch || !spot) return;
        // It comes down from above the window, from a little to the left or right of its perch.
        const side = Math.random() < 0.5 ? -1 : 1;
        const from = { x: spot.x + side * (150 + Math.random() * 200), y: -OWL_SIZE };
        owl = { perch, away: null, from, kind: 'arrive', start: performance.now(), duration: ARRIVE_MS };
        return;
      }
      if (owl.from || !owl.perch || Math.random() >= MOVE_CHANCE) return; // still flying, or staying put
      const here = perchSpot(owl.perch);
      if (!here) return;
      const next = Math.random() < 0.5 ? findPerch(owl.perch.el) : null;
      const nextSpot = next && perchSpot(next);
      if (next && nextSpot) {
        const distance = Math.hypot(nextSpot.x - here.x, nextSpot.y - here.y);
        owl = { perch: next, away: null, from: here, kind: 'hop', start: performance.now(), duration: 500 + distance * 0.8 };
      } else {
        const side = here.x < window.innerWidth / 2 ? -1 : 1; // away towards the nearer side
        const away = { x: here.x + side * 300, y: -OWL_SIZE * 2 };
        owl = { perch: null, away, from: here, kind: 'leave', start: performance.now(), duration: LEAVE_MS };
      }
    };

    // Where a flying owl is at time t (0 to 1) between `from` and `to`. Arriving, it dives steeply and then levels
    // out to land; leaving, it starts level and climbs; hopping to another perch, it rises in an arc.
    const flightPoint = (kind: Owl['kind'], from: Point, to: Point, t: number): Point => {
      const x = from.x + (to.x - from.x) * t;
      if (kind === 'arrive') return { x, y: from.y + (to.y - from.y) * (1 - (1 - t) ** 2) };
      if (kind === 'leave') return { x, y: from.y + (to.y - from.y) * t * t };
      return { x, y: from.y + (to.y - from.y) * t - 60 * 4 * t * (1 - t) };
    };

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      let target = owl ? (owl.perch ? perchSpot(owl.perch) : owl.away) : null;
      // Gone if its perch was removed, or if it sits on something that has scrolled off screen.
      if (owl && (!target || (!owl.from && !onScreen(target)))) owl = null;
      if (!owl || !target) {
        el.style.visibility = 'hidden';
        return;
      }
      let { x, y } = target;
      let flying = false;
      if (owl.from) {
        const t = Math.min(1, (performance.now() - owl.start) / owl.duration);
        ({ x, y } = flightPoint(owl.kind, owl.from, target, t));
        flying = t < 1;
        // Turn the flying art to face where the owl is heading. It is mirrored when flying to the right, which
        // also mirrors where its head points.
        const soon = Math.min(t, 0.98);
        const a = flightPoint(owl.kind, owl.from, target, soon);
        const b = flightPoint(owl.kind, owl.from, target, soon + 0.02);
        const heading = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const toRight = b.x > a.x;
        const turn = (((heading - (toRight ? 180 - FLY_ART_HEADING : FLY_ART_HEADING)) % 360) + 540) % 360 - 180;
        if (flyImg.current) {
          flyImg.current.style.scale = toRight ? '-1 1' : '1 1';
          flyImg.current.style.rotate = `${Math.round(turn)}deg`;
        }
        if (!flying) {
          if (owl.kind === 'leave') owl = null; // it is off the top of the window
          else owl.from = null;
        }
      }
      if (!owl) {
        el.style.visibility = 'hidden';
        return;
      }
      if (sitImg.current) sitImg.current.style.display = flying ? 'none' : 'block';
      if (flyImg.current) flyImg.current.style.display = flying ? 'block' : 'none';
      // Spots are on the screen; the owl is placed inside the UI host, so subtract where the host's corner is.
      const host = root instanceof ShadowRoot ? root.host.getBoundingClientRect() : { left: 0, top: 0 };
      el.style.width = `${OWL_SIZE}px`;
      el.style.transform = `translate(${Math.round(x - host.left)}px, ${Math.round(y - host.top)}px)`;
      el.style.visibility = 'visible';
    };
    frame = requestAnimationFrame(tick);
    const timer = window.setInterval(roll, CHECK_EVERY_MS);
    // The same wobbly outline as the sprites on the page, so the owl looks hand drawn too.
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
    <div ref={box} className="fo-page-owl" style={{ visibility: 'hidden' }} aria-hidden="true">
      <img ref={sitImg} src={art.sit!} alt="" />
      <img ref={flyImg} src={art.fly!} alt="" style={{ display: 'none' }} />
    </div>
  );
}
