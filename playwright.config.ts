import { defineConfig, devices } from '@playwright/test';

// Stage 5.5 e2e smoke per queue.md. Runs against the Vite dev server (which
// boots MSW in-browser when VITE_MSW_ENABLED=true — see .env.development +
// src/main.tsx). No separate backend process required.
//
// Root-cause fix for CI (2026-04-28): `.env.development` is gitignored so CI
// runners never see it. Without it, `VITE_MSW_ENABLED` defaults to `false`,
// MSW doesn't start, and every OTP request errors against the non-existent
// backend at localhost:8000. `webServer.env` injects the required vars so
// the dev server is always MSW-enabled regardless of local env file state.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // MSW state is per-context; serialise to keep specs deterministic.
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // CI runners are slower; give individual interactions 30 s before failing.
    actionTimeout: process.env.CI ? 30_000 : 15_000,
    navigationTimeout: process.env.CI ? 60_000 : 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    // Longer startup budget for CI where node_modules are cached but still
    // slower than a warm local dev server.
    timeout: process.env.CI ? 120_000 : 60_000,
    // Explicitly set every VITE_* var the app needs so CI doesn't depend on
    // a gitignored .env.development file being present on the runner.
    env: {
      VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
      VITE_APP_ENV: 'development',
      VITE_MSW_ENABLED: 'true', // ← critical: starts MSW service worker
      VITE_OTP_BYPASS_HINT: 'true',
      VITE_DEBUG_PANEL: 'false',
      VITE_PROFILE_V1_ENABLED: 'false',
      VITE_OCR_SERVER_ENABLED: 'false',
      VITE_WHISPER_SERVER_ENABLED: 'false',
      VITE_DOCUMENTS_UPLOAD_ENABLED: 'false',
      VITE_PARTNER_UPGRADE_ENABLED: 'false',
      VITE_SENTRY_DSN: '',
    },
  },
});
