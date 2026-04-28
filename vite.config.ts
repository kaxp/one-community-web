/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Stage 5.5 — Playwright specs live in `e2e/` and use the
    // `@playwright/test` runner, not vitest. Exclude them so `pnpm test`
    // stays focused on unit + component tests.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    env: {
      VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
      VITE_APP_ENV: 'development',
      VITE_OTP_BYPASS_HINT: 'true',
      VITE_MSW_ENABLED: 'false',
      VITE_DEBUG_PANEL: 'false',
      VITE_PROFILE_V1_ENABLED: 'false',
      VITE_OCR_SERVER_ENABLED: 'false',
      VITE_WHISPER_SERVER_ENABLED: 'false',
      VITE_DOCUMENTS_UPLOAD_ENABLED: 'false',
      VITE_SENTRY_DSN: '',
    },
  },
});
