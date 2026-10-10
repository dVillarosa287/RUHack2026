import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Forest',
    description: 'Plant notes on any web page and watch them grow into a forest.',
    permissions: ['storage', 'alarms'],
    host_permissions: ['<all_urls>'],
    // An action with no popup lets background.ts react when the icon is clicked.
    action: { default_title: 'Forest: show or hide the toolbar' },
    // Real sprite art in public/sprites/ is loaded inside web pages, so it must be listed here.
    web_accessible_resources: [{ resources: ['sprites/*'], matches: ['<all_urls>'] }],
  },
});
