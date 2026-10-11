import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { trimPng } from './scripts/trim-art';

// The art teammates add to images/ (sprites, the frog, forest icons). The build crops the empty margin off each one and copies it
// into the extension as a plain file (images embedded inside the content script would be blocked on sites with a
// strict content security policy). The originals in images/ are not changed.
// Every PNG except the extension icons. Most art is colored already; "uncolored-*" art is tinted by SpriteIcon.
// The Minimal theme's shapes come from minimal-icons/ and are published under sprites/minimal/, so the list names them
// 'minimal/<file>'. Each entry is [folder it is read from, name it is published and looked up under].
const ART_SOURCES: [string, string][] = [
  ...readdirSync('images')
    .filter((file) => file.endsWith('.png') && !/^icon\d+\.png$/.test(file))
    .map((file): [string, string] => ['images', file]),
  ...readdirSync('minimal-icons')
    .filter((file) => file.endsWith('.png'))
    .map((file): [string, string] => ['minimal-icons', `minimal/${file}`]),
];
const ART_FILES = ART_SOURCES.map(([, name]) => name);

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
      mkdirSync(resolve(trimmedDir, 'minimal'), { recursive: true });
      for (const [folder, name] of ART_SOURCES) {
        const trimmed = resolve(trimmedDir, name);
        writeFileSync(trimmed, trimPng(readFileSync(resolve(folder, basename(name)))));
        files.push({ absoluteSrc: trimmed, relativeDest: `sprites/${name}` });
      }
    },
  },
  manifest: {
    name: 'Forest',
    description: 'Plant notes on any web page and watch them grow into a forest.',
    permissions: ['storage', 'alarms'],
    host_permissions: ['<all_urls>'],
    // An action with no popup lets background.ts react when the icon is clicked.
    action: { default_title: 'Forest: show or hide the toolbar' },
    // The art is drawn inside web pages, so web pages must be allowed to load it.
    web_accessible_resources: [{ resources: ['sprites/*', 'sprites/minimal/*'], matches: ['<all_urls>'] }],
  },
});
