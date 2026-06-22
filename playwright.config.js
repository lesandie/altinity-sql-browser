import { defineConfig } from '@playwright/test';

// Real-browser regression tests. happy-dom (the unit layer) has no scrollbar or
// real box layout, so render-layer bugs — e.g. the editor's highlight drifting
// behind the selection when a scrollbar shrinks the textarea's client box —
// can only be caught in a real engine. These run separately from `npm test`.
//
// Setup once per machine: `npx playwright install chromium`.
// Run: `npm run test:e2e`.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  // Serve the repo root over HTTP so the harness can import the *actual* source
  // modules (/src/**) as native ESM — no bundling, always current.
  webServer: {
    command: 'python3 -m http.server -d . 5599',
    url: 'http://127.0.0.1:5599/tests/e2e/editor.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5599',
    browserName: 'chromium',
  },
});
