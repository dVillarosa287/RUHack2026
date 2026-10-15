import { useEffect, useState } from "react";
import { CEREBRAS_MODEL, GEMINI_MODEL, testAiKey, type AiProvider } from "@/lib/ai";
import { getSettings, updateSettings } from "@/lib/storage";
import { DEFAULT_THEME_ID, THEMES, useWords } from "@/lib/theme";

/** The public copy of docs/PRIVACY_POLICY.md. The same link goes on the Chrome Web Store listing. */
const PRIVACY_POLICY_URL = "https://github.com/dVillarosa287/RUHack2026/blob/main/docs/PRIVACY_POLICY.md";

/** Where each provider's key and text go, and its terms. Must match docs/PRIVACY_POLICY.md (Chrome Web Store rules). */
const PROVIDERS: Record<AiProvider, { name: string; host: string; terms: string; extra: string }> = {
  gemini: {
    name: "Google",
    host: "generativelanguage.googleapis.com",
    terms: "https://ai.google.dev/gemini-api/terms",
    extra: " On Google's free tier, Google may use what you send to improve its products, and people may read it.",
  },
  cerebras: { name: "Cerebras", host: "api.cerebras.ai", terms: "https://www.cerebras.ai/terms-of-service", extra: "" },
};

/** What leaves the browser when an AI button is pressed, shown under each key field. */
function AiDisclosure({ provider, forestWord }: { provider: AiProvider; forestWord: string }) {
  const p = PROVIDERS[provider];
  return (
    <p className="text-xs text-ink-muted">
      Your key is your own account with {p.name}. It is stored only in this browser and sent only to {p.host}, and
      only when you press an AI button. Then the text you saved in that {forestWord} (and, for "Grow from link", the
      text of the linked page) is sent there too. We have no server and never see your key or notes. {p.name}'s{" "}
      <a href={p.terms} target="_blank" rel="noreferrer" className="text-primary underline">terms</a> apply.{p.extra}{" "}
      AI answers can be wrong.{" "}
      <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" className="text-primary underline">Privacy policy</a>
    </p>
  );
}

/**
 * Settings: where the user pastes their Gemini API key and selects their theme.
 */
export function SettingsPage() {
  const [key, setKey] = useState<string | null>(null); // null while loading
  const [cerebrasKey, setCerebrasKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>(DEFAULT_THEME_ID);
  // Minutes before a planted apple grows into an apple tree and asks its question.
  const [reviewMinutes, setReviewMinutes] = useState(5);
  const [show, setShow] = useState(false);
  const [showCerebras, setShowCerebras] = useState(false);
  const [saved, setSaved] = useState<AiProvider | null>(null);
  // The result of the "Test key" button: null before it is pressed.
  const [test, setTest] = useState<{ provider: AiProvider; ok: boolean; text: string } | null>(null);
  const words = useWords(); // nature words, or plain ones in the Minimal theme

  useEffect(() => {
    void getSettings().then((s) => {
      setKey(s.geminiKey);
      setCerebrasKey(s.cerebrasKey);
      if (s.theme) setTheme(s.theme);
      setReviewMinutes(s.reviewMinutes);
    });
  }, []);

  async function save(value: string) {
    await updateSettings({ geminiKey: value.trim() });
    setKey(value.trim());
    setSaved('gemini');
    setTest(null);
  }

  async function saveCerebras(value: string) {
    await updateSettings({ cerebrasKey: value.trim() });
    setCerebrasKey(value.trim());
    setSaved('cerebras');
    setTest(null);
  }

  async function handleThemeChange(newTheme: string) {
    setTheme(newTheme);
    // Saving is all it takes: watchTheme (viewer main.tsx, and the on-page UI in every tab) and useThemeId (sprite
    // art and names) listen for this change and re-theme everything live.
    await updateSettings({ theme: newTheme });
  }

  /** Sends one tiny request to Gemini with the saved key, so the user knows the key and the model name work. */
  async function runTest(provider: AiProvider) {
    setTest({ provider, ok: true, text: "Testing…" });
    try {
      await testAiKey(provider);
      setTest({ provider, ok: true, text: `The key works with ${provider === 'cerebras' ? CEREBRAS_MODEL : GEMINI_MODEL}.` });
    } catch (error) {
      setTest({
        provider,
        ok: false,
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (key === null || cerebrasKey === null) return <p>Loading…</p>;

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <section className="space-y-3 rounded-xl border-2 border-edge bg-surface p-5">
        <h2 className="text-lg font-semibold">Gemini API key</h2>
        <p className="text-sm text-ink-muted">
          {words.aiUses}
          Get a free key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            aistudio.google.com/apikey
          </a>{" "}
          and paste it here.
        </p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save(key);
          }}
        >
          <input
            type={show ? "text" : "password"}
            className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-alt px-3 py-2 font-mono text-sm"
            placeholder="Paste your key"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setSaved(null);
            }}
          />
          <button
            type="button"
            className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-primary-soft"
            onClick={() => setShow(!show)}
          >
            {show ? "Hide" : "Show"}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-strong"
          >
            Save
          </button>
          {key && (
            <button
              type="button"
              className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-primary-soft"
              onClick={() => void save(key).then(() => runTest('gemini'))}
            >
              Test key
            </button>
          )}
          {key && (
            <button
              type="button"
              className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-danger-soft"
              onClick={() => void save("")}
            >
              Remove
            </button>
          )}
        </form>
        {saved === 'gemini' && !test && (
          <p className="text-sm text-primary">
            {key ? "Key saved." : "Key removed."}
          </p>
        )}
        {test?.provider === 'gemini' && (
          <p className={`text-sm ${test.ok ? "text-primary" : "text-ink"}`}>
            {test.ok ? "" : "Not working: "}
            {test.text}
          </p>
        )}
        <AiDisclosure provider="gemini" forestWord={words.forest} />
      </section>

      <br />

      <section className="space-y-3 rounded-xl border-2 border-edge bg-surface p-5">
        <h2 className="text-lg font-semibold">Cerebras API key</h2>
        <p className="text-sm text-ink-muted">
          Use Cerebras with the {CEREBRAS_MODEL} model for quizzes, link growth, and study-guide exports.
          Get a key at{" "}
          <a href="https://cloud.cerebras.ai/" target="_blank" rel="noreferrer" className="text-primary underline">cloud.cerebras.ai</a>.
        </p>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void saveCerebras(cerebrasKey); }}>
          <input
            type={showCerebras ? "text" : "password"}
            className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-alt px-3 py-2 font-mono text-sm"
            placeholder="Paste your Cerebras key"
            autoComplete="off"
            spellCheck={false}
            value={cerebrasKey}
            onChange={(e) => { setCerebrasKey(e.target.value); setSaved(null); }}
          />
          <button type="button" className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-primary-soft" onClick={() => setShowCerebras(!showCerebras)}>{showCerebras ? "Hide" : "Show"}</button>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-strong">Save</button>
          {cerebrasKey && <button type="button" className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-primary-soft" onClick={() => void saveCerebras(cerebrasKey).then(() => runTest('cerebras'))}>Test key</button>}
          {cerebrasKey && <button type="button" className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-danger-soft" onClick={() => void saveCerebras("")}>Remove</button>}
        </form>
        {saved === 'cerebras' && !test && <p className="text-sm text-primary">{cerebrasKey ? "Key saved." : "Key removed."}</p>}
        {test?.provider === 'cerebras' && <p className={`text-sm ${test.ok ? "text-primary" : "text-ink"}`}>{test.ok ? "" : "Not working: "}{test.text}</p>}
        <AiDisclosure provider="cerebras" forestWord={words.forest} />
      </section>

      <br />

      <section className="space-y-3 rounded-xl border-2 border-edge bg-surface p-5">
        <h2 className="text-lg font-semibold">Theme</h2>
        <p className="text-sm text-ink-muted">
          Choose your preferred color scheme and visual appearance for the app.
        </p>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-edge bg-surface-alt px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
          >
            {Object.values(THEMES).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <br />

      <section className="space-y-3 rounded-xl border-2 border-edge bg-surface p-5">
        <h2 className="text-lg font-semibold">Active recall timing</h2>
        <p className="text-sm text-ink-muted">
          {words.recallHelp}
        </p>
        <select
          className="rounded-lg border border-edge bg-surface-alt px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          value={reviewMinutes}
          onChange={(e) => {
            const minutes = Number(e.target.value);
            setReviewMinutes(minutes);
            void updateSettings({ reviewMinutes: minutes });
          }}
        >
          {REVIEW_CHOICES.map(([minutes, label]) => (
            <option key={minutes} value={minutes}>
              {label}
            </option>
          ))}
        </select>
      </section>
    </>
  );
}

/** The choices for the active recall time, in minutes. 30 seconds is for showing it in a demo. */
const REVIEW_CHOICES: [number, string][] = [
  [0.5, "30 seconds (demo)"],
  [1, "1 minute"],
  [2, "2 minutes"],
  [5, "5 minutes"],
  [10, "10 minutes"],
  [30, "30 minutes"],
  [60, "1 hour"],
  [1440, "1 day"],
];
