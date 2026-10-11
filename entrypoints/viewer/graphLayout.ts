// The math behind the graph view: where new nodes go, and where the large trees go.
// No React here, so it is easy to read on its own.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import type { Seed } from '@/lib/storage';

export interface Point {
  x: number;
  y: number;
}

/** A web page with this many seeds or more gets a large tree in the graph (docs/SPEC.md, Forest viewer). */
export const LARGE_TREE_MIN_SEEDS = 2;

/**
 * The pages that get a large tree, as page address -> ids of that page's seeds.
 * Worked out from the seeds every time, never saved. Text notes have no page (url ''), so they never count.
 */
export function largeTreePages(seeds: Seed[]): Map<string, string[]> {
  const byUrl = new Map<string, string[]>();
  for (const seed of seeds) {
    if (!seed.url) continue;
    byUrl.set(seed.url, [...(byUrl.get(seed.url) ?? []), seed.id]);
  }
  return new Map([...byUrl].filter(([, ids]) => ids.length >= LARGE_TREE_MIN_SEEDS));
}

/** The middle of some points. A large tree stands in the middle of its seeds, which the layout keeps clear. */
export function middleOf(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * The nearest spot to `start` that is at least `clearance` away from every point in `others`, looking in growing
 * circles around it. Used so a large tree or a new note never covers a seed.
 */
export function clearSpotNear(start: Point, others: Point[], clearance: number): Point {
  const isClear = (p: Point) => others.every((o) => Math.hypot(o.x - p.x, o.y - p.y) >= clearance);
  if (isClear(start)) return start;
  for (let radius = 30; radius <= 400; radius += 30) {
    for (let step = 0; step < 16; step++) {
      const angle = (step / 16) * Math.PI * 2 - Math.PI / 2; // start straight above
      const spot = { x: start.x + Math.cos(angle) * radius, y: start.y + Math.sin(angle) * radius };
      if (isClear(spot)) return spot;
    }
  }
  return start;
}

/**
 * Where a large tree stands: near the middle of its seeds, without covering any seed in the graph.
 * 150 (was 95): a large tree is about 170 wide and 160 tall with its label, a seed about 130 by 95, so their
 * centers must be roughly 130+ apart or the two boxes overlap.
 */
export function largeTreeSpot(mySeeds: Point[], allSeeds: Point[]): Point {
  return clearSpotNear(middleOf(mySeeds), allSeeds, 150);
}

// Spacing numbers for the layout below. A seed node is 130 wide and about 95 tall (sprite plus a 2-line label),
// a large tree about 170 by 160 (graph.css), so these are sized from the real node boxes.
// Each "radius" is half the space a node keeps to itself; two nodes never get closer than their radii added up.
const SEED_RADIUS = 85; // was 55: 55 was narrower than the 130 wide node, so neighbors overlapped
const TREE_RADIUS = 110; // the invisible page point is where a large tree stands, and trees are bigger
const PAGE_DISTANCE = 200; // was 110: SEED_RADIUS + TREE_RADIUS = 195, so seeds sit just outside the tree
const PUSH = -700; // was -260: every node pushes every other node away; stronger means roomier overall
const CENTER_PULL = 0.02; // was 0.04: a gentler pull to the middle, so the push can spread things out
const START_RING = 130; // was 60: new seeds start this far from their page point

interface SimNode extends SimulationNodeDatum {
  id: string;
}

/**
 * Gives a spot to every seed that does not have one yet, and returns only those new spots.
 * Seeds that already have a spot (in `known`) stay exactly where they are: the user placed them.
 *
 * How: a d3-force simulation, run instantly (400 steps) instead of animated. Nodes push each other apart, and
 * each seed is tied by a spring to an invisible point for its web page, so seeds from one page end up in a ring
 * around that point. That point is where the page's large tree stands.
 */
export function layoutNewSeeds(seeds: Seed[], known: Map<string, Point>): Map<string, Point> {
  const fresh = new Map<string, Point>();
  if (seeds.every((s) => known.has(s.id))) return fresh;

  // One invisible point per page, started in the middle of that page's placed seeds if it has any.
  const pages = new Map<string, SimNode>();
  for (const seed of seeds) {
    if (!seed.url || pages.has(seed.url)) continue;
    const placed = seeds.filter((s) => s.url === seed.url && known.has(s.id)).map((s) => known.get(s.id)!);
    pages.set(seed.url, { id: 'page:' + seed.url, ...(placed.length ? middleOf(placed) : {}) });
  }

  const nodes: SimNode[] = seeds.map((seed, i) => {
    const spot = known.get(seed.id);
    if (spot) return { id: seed.id, x: spot.x, y: spot.y, fx: spot.x, fy: spot.y };
    // New seeds start near their page's point (spread in a small circle) so the simulation settles quickly.
    const page = seed.url ? pages.get(seed.url) : undefined;
    if (page?.x !== undefined && page.y !== undefined) {
      const angle = i * 2.4;
      return { id: seed.id, x: page.x + Math.cos(angle) * START_RING, y: page.y + Math.sin(angle) * START_RING };
    }
    return { id: seed.id }; // d3 picks a starting spot
  });

  const links = seeds.filter((s) => s.url).map((s) => ({ source: s.id, target: 'page:' + s.url }));

  const simulation = forceSimulation<SimNode>([...nodes, ...pages.values()])
    .force('push', forceManyBody().strength(PUSH))
    .force('space', forceCollide<SimNode>((n) => (n.id.startsWith('page:') ? TREE_RADIUS : SEED_RADIUS)))
    .force('page', forceLink<SimNode, { source: string; target: string }>(links).id((n) => n.id).distance(PAGE_DISTANCE).strength(0.5))
    .force('x', forceX(0).strength(CENTER_PULL))
    .force('y', forceY(0).strength(CENTER_PULL))
    .stop();
  simulation.tick(400); // a few more steps than before (300) because the nodes now travel farther to settle

  for (const node of nodes) {
    if (!known.has(node.id)) fresh.set(node.id, { x: Math.round(node.x ?? 0), y: Math.round(node.y ?? 0) });
  }
  return fresh;
}
