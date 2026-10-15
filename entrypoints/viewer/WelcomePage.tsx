import { spriteLabel, useThemeId, useWords } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';
import { settingsHref } from './route';

/**
 * The welcome page (#/welcome). The background worker opens it once, when the extension is first installed (never on
 * an update). Four short steps; the full help is behind the ? button.
 */
export function WelcomePage() {
  const words = useWords();
  const themeId = useThemeId();
  const pad = spriteLabel('lilypad', themeId);
  const apple = spriteLabel('fruitsprout', themeId);
  const steps: { sprite: Parameters<typeof SpriteIcon>[0]['type']; title: string; text: string }[] = [
    { sprite: 'sprout', title: 'Open the toolbar', text: `Go to any web page (reload it if it was already open) and click the ${words.appName} icon in Chrome's toolbar. Pin it from the puzzle-piece menu so it is easy to find.` },
    { sprite: 'flower', title: 'Mark what matters', text: `Pick a sprite, then drag over text to highlight it, or click anywhere to put the sprite there. It is saved to that page and is back on your next visit.` },
    { sprite: 'lilypad', title: 'Study it later', text: `Text marked with the ${pad} becomes a quiz. The ${apple} asks you about its text a few minutes after you put it down, then again a few days later.` },
    { sprite: 'owl', title: `See your ${words.forests}`, text: `The tree button on the toolbar opens your ${words.seeds} as a list and a graph, where you can connect them.` },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to {words.appName}</h1>
        <p className="mt-2 text-ink-muted">Your notes stay in this browser. Nothing is sent anywhere unless you press a button that says so.</p>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-4 rounded-xl border-2 border-edge bg-surface p-4">
            <SpriteIcon type={step.sprite} size={44} />
            <div>
              <h2 className="font-semibold">{i + 1}. {step.title}</h2>
              <p className="text-sm text-ink-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border-2 border-edge bg-surface-alt p-4 text-sm">
        <p className="font-semibold">Optional: AI quizzes</p>
        <p className="mt-1 text-ink-muted">
          Quizzes work without AI. For questions written by AI, add your own free Gemini or Cerebras key in <a className="underline" href={settingsHref}>Settings</a>. It is only sent to that provider, and only when you ask for a quiz.
        </p>
      </div>
      <a href="#" className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-ink hover:bg-primary-strong">
        Go to your {words.forests}
      </a>
    </section>
  );
}
