import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { trimPng } from './scripts/trim-art';

// The art teammates add to images/ (sprites, the frog). The build crops the empty margin off each one and copies it
// into the extension as a plain file (images embedded inside the content script would be blocked on sites with a
// strict content security policy). The originals in images/ are not changed.
const ART_FILES = readdirSync('images').filter((file) => /^(uncolored-|frog).*\.png$/.test(file));

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    // lib/theme/index.ts uses this list to know which art exists.
    define: { __ART_FILES__: JSON.stringify(ART_FILES) },
  }),
  hooks: {
    'build:publicAssets': (_wxt, files) => {
      const trimmedDir = resolve('.wxt', 'art-trimmed');
      mkdirSync(trimmedDir, { recursive: true });
      for (const file of ART_FILES) {
        const trimmed = resolve(trimmedDir, file);
        writeFileSync(trimmed, trimPng(readFileSync(resolve('images', file))));
        files.push({ absoluteSrc: trimmed, relativeDest: `sprites/${file}` });
      }
    },
  },
  manifest: {
    name: 'Forest',
    description: 'Plant notes on any web page and watch them grow into a forest.',
    // unlimitedStorage: lily pad screenshots would soon fill the normal 10 MB.
    permissions: ['storage', 'alarms', 'unlimitedStorage'],
    host_permissions: ['<all_urls>'],
    // An action with no popup lets background.ts react when the icon is clicked.
    action: { default_title: 'Forest: show or hide the toolbar' },
    // The art is drawn inside web pages, so web pages must be allowed to load it.
    web_accessible_resources: [{ resources: ['sprites/*'], matches: ['<all_urls>'] }],
  },
});
