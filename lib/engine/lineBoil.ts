const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const DEFAULT_SCALE = 3;
const DEFAULT_SPEED_MS = 100;
const DEFAULT_FRAMES = 8;
const BASE_FREQUENCY = 0.04;
const NUM_OCTAVES = 3;
const SEEDS = [1, 42, 7, 99, 23, 61, 83, 14, 55, 37, 72, 5];
let controllerId = 0;

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

/**
 * Applies the SVG turbulence/displacement approach from tomcreighton's boil library
 * (https://github.com/tomcreighton/boil) to elements inside this document or shadow root.
 */
export function createLineBoil(elements: Iterable<HTMLElement>, root: Document | ShadowRoot, options: LineBoilOptions = {}): () => void {
  const targetElements = Array.from(elements);
  const scale = options.scale ?? DEFAULT_SCALE;
  const speed = options.speed ?? DEFAULT_SPEED_MS;
  const frames = Math.min(12, Math.max(2, options.frames ?? DEFAULT_FRAMES));
  const id = controllerId++;
  const key = setKey(scale, frames, id);
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
    turbulence.setAttribute('seed', String(SEEDS[frame % SEEDS.length]));
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

  let frame = 0;
  // The first frame goes on right away. Without it, each restart (every time a sprite is placed) left the markers
  // with no filter for up to one tick, and they flickered.
  for (const element of targetElements) element.style.filter = `url(#${key}-0)`;
  let lastTick = performance.now();
  let animationFrame = 0;
  const tick = (now: number) => {
    if (now - lastTick >= speed) {
      frame = (frame + 1) % frames;
      const filterUrl = `url(#${key}-${frame})`;
      for (const element of targetElements) element.style.filter = filterUrl;
      lastTick = now;
    }
    animationFrame = requestAnimationFrame(tick);
  };
  animationFrame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(animationFrame);
    for (const element of targetElements) element.style.removeProperty('filter');
    svg.remove();
  };
}
