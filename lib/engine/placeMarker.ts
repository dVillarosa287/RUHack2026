import { saveSeed, type Seed, type SpriteType } from '@/lib/storage';
import { spriteColorKey } from '@/lib/theme';
import { buildMarkerAnchor, nearbyText } from './anchor';
import { pageUrl } from './pageUrl';

interface Placement {
  forestId: string;
  spriteType: SpriteType;
  clientX: number;
  clientY: number;
  /** The page element under that spot. */
  target: Element;
  /** How big the sprite is drawn (1 is normal). */
  scale?: number;
}

/** The link a spot is on, if any. Other kinds of address, such as `javascript:`, are not links worth keeping. */
function linkAt(target: Element): HTMLAnchorElement | null {
  const link = target.closest('a[href]');
  return link instanceof HTMLAnchorElement && /^(https?|mailto|tel|file|ftp):/i.test(link.href) ? link : null;
}

/**
 * Saves a sprite at a spot on the page. A click and a drop from the toolbar both end up here. On a link the
 * seed is a `link` seed: the user stays on the page, and the seed keeps the link's destination in `linkTarget`.
 */
export async function placeMarker({ forestId, spriteType, clientX, clientY, target, scale }: Placement): Promise<Seed> {
  const link = linkAt(target);
  return saveSeed({
    forestId,
    kind: link ? 'link' : 'sprite',
    spriteType,
    color: spriteColorKey(spriteType), // each sprite has its own color; there is no picker
    url: pageUrl(), // the PDF's address on our PDF page
    pageTitle: document.title,
    text: link ? ((link.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || link.href) : nearbyText(target),
    linkTarget: link ? link.href : null,
    anchor: buildMarkerAnchor(clientX, clientY, target),
    scale,
  });
}
