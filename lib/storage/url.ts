// Tracking parameters that make one page look like many.
const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'yclid', 'twclid', 'igshid', 'mc_cid', 'mc_eid', '_ga', '_gl', 'ref_src',
]);

/** Strips tracking parameters and the # part, so one page always has one key. */
export function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith('utm_') || TRACKING_PARAMS.has(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
