/**
 * Draws the on-page UI above everything on the page, whatever z-index the page uses.
 *
 * A very large z-index is not enough: a site can use the same number and come later in the page, or use a
 * modal dialog, a popover or fullscreen, which the browser draws in its "top layer" above all z-indexes.
 * Making our host a popover puts it in that layer too. Things added to the top layer later are drawn above
 * earlier ones, so when the page adds one, we step out and back in to be last again.
 */
export function keepOnTop(host: HTMLElement): () => void {
  if (typeof host.showPopover !== 'function') return () => {}; // very old browser: the large z-index still applies

  host.setAttribute('popover', 'manual');

  const raise = () => {
    try {
      if (host.matches(':popover-open')) host.hidePopover();
      host.showPopover();
    } catch {
      // Not connected to the page right now. The next change will try again.
    }
  };

  let queued = false;
  const raiseSoon = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      raise();
    });
  };

  // A popover on the page opening (our own opening is ignored).
  const onToggle = (e: Event) => {
    if (e.target !== host && (e as ToggleEvent).newState === 'open') raiseSoon();
  };
  // A modal dialog opening: it gets the `open` attribute.
  const observer = new MutationObserver((records) => {
    if (records.some((r) => r.target !== host && (r.target as Element).tagName === 'DIALOG')) raiseSoon();
  });

  raise();
  document.addEventListener('toggle', onToggle, true);
  document.addEventListener('fullscreenchange', raiseSoon);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['open'], subtree: true });

  return () => {
    document.removeEventListener('toggle', onToggle, true);
    document.removeEventListener('fullscreenchange', raiseSoon);
    observer.disconnect();
    try {
      host.hidePopover();
    } catch {
      // Already gone.
    }
  };
}
