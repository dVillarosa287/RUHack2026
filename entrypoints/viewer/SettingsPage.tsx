import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/lib/storage';

/**
 * Settings: where the user pastes their Gemini API key. The key is saved in this browser only
 * (chrome.storage.local through the storage module) and is never sent anywhere except to Google's Gemini API.
 */
export function SettingsPage() {
  const [key, setKey] = useState<string | null>(null); // null while loading
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => void getSettings().then((s) => setKey(s.geminiKey)), []);

  async function save(value: string) {
    await updateSettings({ geminiKey: value.trim() });
    setKey(value.trim());
    setSaved(true);
  }

  if (key === null) return <p>Loading…</p>;

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <section className="space-y-3 rounded-xl border-2 border-edge/30 bg-surface p-5">
        <h2 className="text-lg font-semibold">Gemini API key</h2>
        <p className="text-sm text-ink-muted">
          Quizzes, suggested roots and the frog's summaries use Google's Gemini. Get a free key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary underline">aistudio.google.com/apikey</a> and paste it here.
        </p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save(key);
          }}
        >
          <input
            type={show ? 'text' : 'password'}
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
          <button type="button" className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-primary-soft" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-strong">Save</button>
          {key && (
            <button type="button" className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-danger-soft" onClick={() => void save('')}>Remove</button>
          )}
        </form>
        {saved && <p className="text-sm text-primary">{key ? 'Key saved.' : 'Key removed.'}</p>}
        <p className="text-xs text-ink-muted">
          The key stays in this browser. When you use an AI feature, the text you saved in that forest is sent to Google to write the questions or summary. Nothing is sent unless you ask for it.
        </p>
      </section>
    </>
  );
}
