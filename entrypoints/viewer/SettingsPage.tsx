import { useEffect, useState } from "react";
import { GEMINI_MODEL, testGeminiKey } from "@/lib/ai";
import { getSettings, updateSettings } from "@/lib/storage";
import { THEMES } from "@/lib/theme";

/**
 * Settings: where the user pastes their Gemini API key and selects their theme.
 */
export function SettingsPage() {
  const [key, setKey] = useState<string | null>(null); // null while loading
  const [theme, setTheme] = useState<string>("jungle");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  // The result of the "Test key" button: null before it is pressed.
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void getSettings().then((s) => {
      setKey(s.geminiKey);
      if (s.theme) setTheme(s.theme);
    });
  }, []);

  async function save(value: string) {
    await updateSettings({ geminiKey: value.trim() });
    setKey(value.trim());
    setSaved(true);
    setTest(null);
  }

  async function handleThemeChange(newTheme: string) {
    setTheme(newTheme);
    await updateSettings({ theme: newTheme });
    // Optional: Update document attribute if your app applies themes dynamically this way
    document.documentElement.setAttribute("data-theme", newTheme);
  }

  /** Sends one tiny request to Gemini with the saved key, so the user knows the key and the model name work. */
  async function runTest() {
    setTest({ ok: true, text: "Testing…" });
    try {
      await testGeminiKey();
      setTest({ ok: true, text: `The key works with ${GEMINI_MODEL}.` });
    } catch (error) {
      setTest({
        ok: false,
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (key === null) return <p>Loading…</p>;

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <section className="space-y-3 rounded-xl border-2 border-edge bg-surface p-5">
        <h2 className="text-lg font-semibold">Gemini API key</h2>
        <p className="text-sm text-ink-muted">
          Quizzes, suggested roots and the frog's summaries use Google's Gemini.
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
              setSaved(false);
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
              onClick={() => void save(key).then(runTest)}
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
        {saved && !test && (
          <p className="text-sm text-primary">
            {key ? "Key saved." : "Key removed."}
          </p>
        )}
        {test && (
          <p className={`text-sm ${test.ok ? "text-primary" : "text-ink"}`}>
            {test.ok ? "" : "Not working: "}
            {test.text}
          </p>
        )}
        <p className="text-xs text-ink-muted">
          The key stays in this browser. When you use an AI feature, the text
          you saved in that forest is sent to Google to write the questions or
          summary. Nothing is sent unless you ask for it.
        </p>
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
    </>
  );
}
