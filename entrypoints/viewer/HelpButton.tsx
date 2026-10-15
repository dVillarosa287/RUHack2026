import { useEffect, useRef, useState } from 'react';
import { HOTBAR, hotbarKey } from '@/lib/onpage-ui/hotbar';
import { MINIMAL_THEME, artUrl, getWords, spriteLabel, useThemeId } from '@/lib/theme';

/** One part of the help text: a heading and its lines. */
type Section = { title: string; lines: string[] };

/**
 * Everything the user can do, as plain text. It is built from the theme's words and sprite names, so the Minimal theme
 * reads "items", "links" and "Star" where the nature themes read "seeds", "roots" and "Sprout".
 * When a feature changes, change its line here too.
 */
function helpSections(themeId: string): Section[] {
  const words = getWords(themeId);
  const minimal = themeId === MINIMAL_THEME.id;
  const name = (type: Parameters<typeof spriteLabel>[0]) => spriteLabel(type, themeId);
  const put = minimal ? 'place' : 'plant'; // "plant a seed" or "place an item"
  const pad = name('lilypad');
  const apple = name('fruitsprout');
  const keys = HOTBAR.map((type, i) => `${hotbarKey(i)} ${name(type)}`).join(', ');

  return [
    {
      title: 'Start here',
      lines: [
        `Open any web page and click this extension's icon in Chrome's toolbar. A small toolbar appears on the page. Click the icon again, or the ✕ on the toolbar, to close it.`,
        `Drag the toolbar by its top to move it, and drag its bottom-left corner to resize it. It stays open, in the same place, in every tab until you close it.`,
        `The drop-down at the top of the toolbar is the ${words.forest} your ${words.seeds} go into. Pick another one, or choose "+ Create new ${words.forest}" at the bottom of the list. The tree button opens the current ${words.forest} in this viewer.`,
        `It does not work on Chrome's own pages (chrome://…) or the Chrome Web Store. After installing or reloading the extension, reload any page that was already open. PDFs open in the extension's own PDF page so they can be marked too.`,
      ],
    },
    {
      title: minimal ? 'Placing on a page' : 'Planting on a page',
      lines: [
        `Click a sprite on the toolbar to pick it up. A faint copy follows your mouse. Then:`,
        `• Click a spot on the page to ${put} it there. It stays attached to the text under it, so it follows the page when you scroll or resize. You can drag it to a new spot.`,
        `• Drag over some text to highlight it in the sprite's color. The sprite sits above the highlight and cannot be moved away from it.`,
        `• Click a link to ${put} a sprite on it. You stay on the page, and the sprite remembers where the link goes. Clicking it here in the viewer opens that link.`,
        `• Drag over an area with no text (a picture or a chart) to save a screenshot of it.`,
        `• Drag a sprite from the toolbar and drop it on the page.`,
        `Keys while the toolbar is open: ${keys} pick a sprite. - and + make the sprite on your mouse smaller or larger before you ${put} it. Esc puts it down. Ctrl+Z (Cmd+Z on Mac) undoes, and Ctrl+Shift+Z redoes. The keys do nothing while you are typing in a text field on the site.`,
        `Pick the shovel, then click a sprite or highlight to remove it (the sprite and its highlight go together).`,
        `Right after you ${put} ${words.aSeed}, a small box lets you type your own note about it. Enter saves, Esc skips, and clicking away saves what you typed. Hover the sprite to read the note, and click the sprite to change it. The ${pad.toLowerCase()} and the ${apple.toLowerCase()} do not take notes.`,
      ],
    },
    {
      title: 'What the sprites are for',
      lines: [
        `The ${pad.toLowerCase()} means "quiz me on this". It only goes on text: drag over a sentence. A plain click with it places nothing.`,
        `The ${apple.toLowerCase()} is for active recall. It also only goes on text. After the active recall time (set in Settings, 5 minutes to start with) ${minimal ? 'a' : 'it grows into an apple tree and a'} small pop-up in the top left of the page you are on asks you one fill-in-the-blank question about the text. Answer it or skip it.${minimal ? '' : ' The apple tree stays on the page.'} It asks again after 1 day, 3 days and a week; a wrong answer starts over from 1 day. Advanced settings can turn this off or change the gaps.`,
        `The ${name('sprout').toLowerCase()} grows into ${minimal ? 'a cloud' : 'a tree'} the next time you reload the page. The others never change, and quiz answers never change anything you saved.`,
        `The other sprites are yours to give a meaning, for example "key idea", "confusing, come back to this" or "definition".`,
        ...(minimal ? [] : [`On pages with ${pad.toLowerCase()}s, a frog now and then jumps onto one and sits there. It is only for fun and is not saved.`]),
      ],
    },
    {
      title: 'The scroll rail',
      lines: [
        `A slim bar on the left edge of the page shows every ${words.seed} on that page. Click a sprite on it to scroll there. The ${words.seed}'s highlight lights up, stays lit for a while and then fades back.`,
        `The shaded block shows which part of the page is on screen. When you jump, the spot you came from is saved as a marker (the "animal"). Click it to go back.`,
      ],
    },
    {
      title: `All ${words.forests}`,
      lines: [
        `This is the first page. Each ${words.forest} is an icon, like folders in Finder. Drag them to arrange them, click one to pick its icon, and double-click one to open it. To delete a ${words.forest} and everything in it, click it, then click Delete below the grid or press the Delete key. It asks first, and it cannot be undone.`,
        `New ${words.forests} are made from the toolbar on a web page.`,
        `Only the current ${words.forest}'s ${words.seeds} show on a page. If a ${words.seed} is missing, switch to its ${words.forest} in the toolbar. "Open on page" does this for you.`,
      ],
    },
    {
      title: `Inside a ${words.forest} (list view)`,
      lines: [
        `Your ${words.seeds} are listed by web page. "Open on page" opens the page and jumps to the ${words.seed}. The shovel button removes it.`,
        `The left side lists the ${words.folders} in this ${words.forest}. Type a name and press + to add one, click one to show only its ${words.seeds}, and drag a ${words.seed} onto a ${words.folder} to move it. The × on a ${words.folder} removes the ${words.folder} but keeps its ${words.seeds}.`,
        `"${words.fromLink}": paste a web address and the AI reads that page, saves its 3 to 6 key ideas as ${words.seeds}, and joins them with ${words.roots} to the ${words.seeds} they relate to. It needs an API key (see Settings) and cannot read PDFs or pages that need a login.`,
        `"Graph view" shows the same ${words.seeds} as a graph.`,
      ],
    },
    {
      title: 'Graph view',
      lines: [
        `Every ${words.seed} is a node. Drag a node to move it; its place is saved. A ${words.seed} is placed automatically the first time you see it.`,
        `Click a node to open its details on the right: change its display text, read or edit its text and your note, open its page, see its ${words.roots}, or remove it.`,
        `To ${words.growRoot}: hold Shift and click a node, then Shift+click another. Do it again on the same two to remove the ${words.root}. Esc cancels. You can also click a line and press Delete.`,
        `Drag with the right mouse button to move a node together with the nodes joined to it by ${words.roots}. On a big tree it moves the tree and all of its ${words.seeds}.`,
        `A big tree appears for every web page that has 2 or more ${words.seeds} in this ${words.forest}, joined to them by faint lines. It is worked out for you and cannot be quizzed.`,
        `Hover a node to light it and its neighbours and fade the rest. Scroll to zoom, drag the background to move around.`,
        `"+ Add note" adds a ${words.seed} of your own that is not from a web page.`,
        `"Export" (under the graph) asks the AI for a study guide of the ${words.forest} and saves it as a PDF or DOCX file.`,
      ],
    },
    {
      title: 'Quizzes',
      lines: [
        `The "${words.quizName(pad)}" button on a ${words.forest}'s page turns all its ${pad.toLowerCase()}s into a quiz, one question per ${pad.toLowerCase()} (at most 10).`,
        `With an API key the AI writes multiple choice questions. Without one, the quiz is fill in the blank, made in your browser. You can remake it with the AI or without any time. The quiz says which one wrote it.`,
        `At the end you see your score and the questions you missed, and can try again.`,
        `Every quiz is kept. Click a quiz's tile to rename it, change its icon or delete it (deleting cannot be undone).`,
      ],
    },
    {
      title: 'Settings',
      lines: [
        `Gemini key and Cerebras key: paste a key to turn on the AI features. Use "Test key" to check it. The key is saved only in this browser. Your saved text is sent to the AI company only when you press an AI button, never automatically.`,
        `Theme: changes the colors and art everywhere, and the Minimal theme also swaps the nature words for plain ones (${words.forests} become folders, ${words.seeds} become items). Open pages update without a reload. Saved names are never renamed.`,
        `Active recall timing: how long after you ${put} ${minimal ? 'a circle' : 'an apple'} it asks its question. 30 seconds is for demos. A new time only applies to ones you add after you change it.`,
      ],
    },
    {
      title: 'Good to know',
      lines: [
        `Everything is saved in this browser on this computer. There is no account, server or sync, so another computer does not see it.`,
        `"Save backup" on a ${words.forest}'s page downloads it as a file. "Load backup" under the ${words.forests} grid adds it back as a new ${words.forest}, here or on another computer. Settings and API keys are never in the file. Removing the extension deletes everything that has no backup.`,
        `The search box on a ${words.forest}'s page and in its graph finds ${words.seeds} by their text, note, page title or address.`,
        `Highlights are found again by their text. If a site changes the wording, a highlight may not show, but it is still listed here.`,
        `Scanned PDFs have no text, so they can be marked with sprites and screenshots but not highlighted.`,
      ],
    },
  ];
}

/**
 * The question-mark button in the viewer's top right corner. It opens a panel of plain help text about everything
 * the user can do. Click the button again, press Esc or click outside to close it.
 */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const themeId = useThemeId();
  const icon = artUrl('minimal/question.png');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge hover:bg-primary-soft"
        title="Help"
        aria-label="Help"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {icon ? <img src={icon} alt="" width={26} height={26} draggable={false} /> : <span aria-hidden="true">?</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[80vh] w-[min(34rem,90vw)] overflow-y-auto rounded-xl border-2 border-edge bg-surface p-5 text-left shadow-md shadow-drop" role="dialog" aria-label="Help">
          <h2 className="mb-3 text-lg font-semibold text-ink">How to use {getWords(themeId).appName}</h2>
          {helpSections(themeId).map((section) => (
            <section key={section.title} className="mb-4 last:mb-0">
              <h3 className="mb-1 font-semibold text-primary">{section.title}</h3>
              {section.lines.map((line) => (
                <p key={line} className="mb-1.5 text-sm text-ink">{line}</p>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
