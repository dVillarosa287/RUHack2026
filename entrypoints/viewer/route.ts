// The viewer's pages, chosen by the part of the address after the #.
//   (nothing)               all forests
//   #/forest/<id>           one forest, as a list of its annotations
//   #/forest/<id>/graph     one forest, as a graph
//   #/settings              settings
export type Route =
  | { page: 'forests' }
  | { page: 'forest'; forestId: string }
  | { page: 'graph'; forestId: string }
  | { page: 'settings' };

export function parseRoute(hash: string = window.location.hash): Route {
  if (hash === '#/settings') return { page: 'settings' };
  const graph = hash.match(/^#\/forest\/([^/]+)\/graph$/);
  if (graph?.[1]) return { page: 'graph', forestId: decodeURIComponent(graph[1]) };
  const forest = hash.match(/^#\/forest\/([^/]+)$/);
  if (forest?.[1]) return { page: 'forest', forestId: decodeURIComponent(forest[1]) };
  return { page: 'forests' };
}

export const forestHref = (forestId: string) => `#/forest/${encodeURIComponent(forestId)}`;
export const graphHref = (forestId: string) => `#/forest/${encodeURIComponent(forestId)}/graph`;
export const settingsHref = '#/settings';
