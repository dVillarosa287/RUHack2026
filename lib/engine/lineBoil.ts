const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const DEFAULT_SCALE = 3;
const DEFAULT_SPEED_MS = 100;
const DEFAULT_FRAMES = 8;
const BASE_FREQUENCY = 0.04;
const NUM_OCTAVES = 3;
let controllerId = 0;

/** A different noise pattern for each frame. Any distinct whole numbers work; these just spread them out. */
const noiseSeed = (frame: number) => frame * 37 + 11;

interface LineBoilOptions {
  scale?: number;
  speed?: number;
  frames?: number;
}

function setKey(scale: number, frames: number, id: number): string {
  return `fo-boil-${id}-${String(scale).replace('.', '_')}-f${frames}`;
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, tag);
}

/** Builds the boil's SVG filters (one per frame) inside `root` and returns the id prefix and the <svg> holding them. */
function buildFilters(root: Document | ShadowRoot | HTMLElement, scale: number, frames: number): { key: string; svg: SVGSVGElement } {
  const key = setKey(scale, frames, controllerId++);
  const svg = createSvgElement('svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  const defs = createSvgElement('defs');
  svg.appendChild(defs);
  root.appendChild(svg);

  for (let frame = 0; frame < frames; frame += 1) {
    const filter = createSvgElement('filter');
    filter.setAttribute('id', `${key}-${frame}`);
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');

    const turbulence = createSvgElement('feTurbulence');
    turbulence.setAttribute('type', 'fractalNoise');
    turbulence.setAttribute('baseFrequency', String(BASE_FREQUENCY));
    turbulence.setAttribute('numOctaves', String(NUM_OCTAVES));
    turbulence.setAttribute('seed', String(noiseSeed(frame)));
    turbulence.setAttribute('stitchTiles', 'stitch');
    turbulence.setAttribute('result', 'noise');

    const displacement = createSvgElement('feDisplacementMap');
    displacement.setAttribute('in', 'SourceGraphic');
    displacement.setAttribute('in2', 'noise');
    displacement.setAttribute('scale', String(scale));
    displacement.setAttribute('xChannelSelector', 'R');
    displacement.setAttribute('yChannelSelector', 'G');

    filter.append(turbulence, displacement);
    defs.appendChild(filter);
  }
  return { key, svg };
}

/** Calls `apply` with the next frame's filter every `speed` ms until the returned function is called. */
function animate(key: string, frames: number, speed: number, apply: (filterUrl: string) => void): () => void {
  let frame = 0;
  // The first frame goes on right away. Without it, each restart (every time a sprite is placed) left the markers
  // with no filter for up to one tick, and they flickered.
  apply(`url(#${key}-0)`);
  let lastTick = performance.now();
  let animationFrame = 0;
  const tick = (now: number) => {
    if (now - lastTick >= speed) {
      frame = (frame + 1) % frames;
      apply(`url(#${key}-${frame})`);
      lastTick = now;
    }
    animationFrame = requestAnimationFrame(tick);
  };
  animationFrame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(animationFrame);
}

function readOptions(options: LineBoilOptions) {
  return {
    scale: options.scale ?? DEFAULT_SCALE,
    speed: options.speed ?? DEFAULT_SPEED_MS,
    frames: Math.min(12, Math.max(2, options.frames ?? DEFAULT_FRAMES)),
  };
}

/**
 * Makes lines wobble like hand-drawn animation ("line boil") by cycling SVG noise filters (feTurbulence +
 * feDisplacementMap, a standard SVG technique), on elements inside this document or shadow root. The idea came from
 * tomcreighton/boil; that repo has no licence, so no code from it may be copied here.
 */
export function createLineBoil(elements: Iterable<HTMLElement>, root: Document | ShadowRoot, options: LineBoilOptions = {}): () => void {
  const targetElements = Array.from(elements);
  const { scale, speed, frames } = readOptions(options);
  const { key, svg } = buildFilters(root, scale, frames);
  const stop = animate(key, frames, speed, (filterUrl) => {
    for (const element of targetElements) element.style.filter = filterUrl;
  });

  return () => {
    stop();
    for (const element of targetElements) element.style.removeProperty('filter');
    svg.remove();
  };
}

/**
 * The same boil, for a list of elements that keeps changing (the viewer's graph, where nodes come and go). Instead of
 * setting each element's filter, it animates the CSS variable `--fo-boil` on `host`, and the CSS gives any element
 * inside it `filter: var(--fo-boil)`. With reduced motion turned on in the system, the lines stay still.
 */
export function createLineBoilVariable(host: HTMLElement, options: LineBoilOptions = {}): () => void {
  const { scale, speed, frames } = readOptions(options);
  const { key, svg } = buildFilters(host, scale, frames);
  const setFilter = (filterUrl: string) => host.style.setProperty('--fo-boil', filterUrl);
  const stop = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? (setFilter(`url(#${key}-0)`), () => {}) : animate(key, frames, speed, setFilter);

  return () => {
    stop();
    host.style.removeProperty('--fo-boil');
    svg.remove();
  };
}
