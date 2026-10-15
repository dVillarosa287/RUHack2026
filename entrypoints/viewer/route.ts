// The viewer's pages, chosen by the part of the address after the #.
//   (nothing)               all forests
//   #/forest/<id>           one forest, as a list of its annotations
//   #/forest/<id>/graph     one forest, as a graph
//   #/forest/<id>/quiz/<c>            the saved quizzes made from the forest's lily pads of color c, as a grid
//   #/forest/<id>/quiz/<c>/new        setting up a new quiz
//   #/forest/<id>/quiz/<c>/<fruitId>  playing one saved quiz
//   #/settings              settings
export type Route =
  | { page: 'forests' }
  | { page: 'forest'; forestId: string }
  | { page: 'graph'; forestId: string }
  | { page: 'quiz'; forestId: string; color: string; fruitId?: string }
  | { page: 'settings' };

export function parseRoute(hash: string = window.location.hash): Route {
  if (hash === '#/settings') return { page: 'settings' };
  const quiz = hash.match(/^#\/forest\/([^/]+)\/quiz\/([^/]+)(?:\/([^/]+))?$/);
  if (quiz?.[1] && quiz[2]) return { page: 'quiz', forestId: decodeURIComponent(quiz[1]), color: decodeURIComponent(quiz[2]), fruitId: quiz[3] && decodeURIComponent(quiz[3]) };
  const graph = hash.match(/^#\/forest\/([^/]+)\/graph$/);
  if (graph?.[1]) return { page: 'graph', forestId: decodeURIComponent(graph[1]) };
  const forest = hash.match(/^#\/forest\/([^/]+)$/);
  if (forest?.[1]) return { page: 'forest', forestId: decodeURIComponent(forest[1]) };
  return { page: 'forests' };
}

export const forestHref = (forestId: string) => `#/forest/${encodeURIComponent(forestId)}`;
export const graphHref = (forestId: string) => `#/forest/${encodeURIComponent(forestId)}/graph`;
export const settingsHref = '#/settings';
export const quizHref = (forestId: string, color: string) => `#/forest/${encodeURIComponent(forestId)}/quiz/${encodeURIComponent(color)}`;
/** The `fruitId` of the "new quiz" page. Saved quiz ids are hex, so they never clash with it. */
export const NEW_QUIZ = 'new';
export const newQuizHref = (forestId: string, color: string) => `${quizHref(forestId, color)}/${NEW_QUIZ}`;
export const playQuizHref = (forestId: string, color: string, fruitId: string) => `${quizHref(forestId, color)}/${encodeURIComponent(fruitId)}`;
