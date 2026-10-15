// The viewer's pages, chosen by the part of the address after the #.
//   (nothing)               all forests
//   #/forest/<id>           one forest, as a list of its annotations
//   #/forest/<id>/graph     one forest, as a graph
//   #/forest/<id>/quiz/<c>            the saved quizzes made from the forest's lily pads of color c, as a grid
//   #/forest/<id>/quiz/<c>/new        setting up a new quiz (…/new?group=<padId> starts with that lily pad group chosen)
//   #/forest/<id>/quiz/<c>/<quizId>  playing one saved quiz
//   #/settings              settings
//   #/welcome               the welcome page, opened once when the extension is installed
export type Route =
  | { page: 'forests' }
  | { page: 'forest'; forestId: string }
  | { page: 'graph'; forestId: string }
  | { page: 'quiz'; forestId: string; color: string; quizId?: string; group?: string }
  | { page: 'settings' }
  | { page: 'welcome' };

export function parseRoute(full: string = window.location.hash): Route {
  const [hash = '', query = ''] = full.split('?');
  if (hash === '#/settings') return { page: 'settings' };
  if (hash === '#/welcome') return { page: 'welcome' };
  const quiz = hash.match(/^#\/forest\/([^/]+)\/quiz\/([^/]+)(?:\/([^/]+))?$/);
  if (quiz?.[1] && quiz[2]) return { page: 'quiz', forestId: decodeURIComponent(quiz[1]), color: decodeURIComponent(quiz[2]), quizId: quiz[3] && decodeURIComponent(quiz[3]), group: new URLSearchParams(query).get('group') ?? undefined };
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
/** The `quizId` of the "new quiz" page. Saved quiz ids are hex, so they never clash with it. */
export const NEW_QUIZ = 'new';
export const newQuizHref = (forestId: string, color: string, group?: string) => `${quizHref(forestId, color)}/${NEW_QUIZ}${group ? `?group=${encodeURIComponent(group)}` : ''}`;
export const playQuizHref = (forestId: string, color: string, quizId: string) => `${quizHref(forestId, color)}/${encodeURIComponent(quizId)}`;
