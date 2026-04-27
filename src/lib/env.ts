import { z } from 'zod';

const truthy = z
  .union([z.string(), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

const Schema = z.object({
  API_BASE_URL: z.string().min(1, 'VITE_API_BASE_URL is required'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  OTP_BYPASS_HINT: truthy.default(false),
  MSW_ENABLED: truthy.default(false),
  DEBUG_PANEL: truthy.default(false),
  PROFILE_V1_ENABLED: truthy.default(false),
  OCR_SERVER_ENABLED: truthy.default(false),
  WHISPER_SERVER_ENABLED: truthy.default(false),
  DOCUMENTS_UPLOAD_ENABLED: truthy.default(false),
  PARTNER_UPGRADE_ENABLED: truthy.default(false),
  SENTRY_DSN: z.string().optional().default(''),
});

const raw = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  APP_ENV: import.meta.env.VITE_APP_ENV,
  OTP_BYPASS_HINT: import.meta.env.VITE_OTP_BYPASS_HINT,
  MSW_ENABLED: import.meta.env.VITE_MSW_ENABLED,
  DEBUG_PANEL: import.meta.env.VITE_DEBUG_PANEL,
  PROFILE_V1_ENABLED: import.meta.env.VITE_PROFILE_V1_ENABLED,
  OCR_SERVER_ENABLED: import.meta.env.VITE_OCR_SERVER_ENABLED,
  WHISPER_SERVER_ENABLED: import.meta.env.VITE_WHISPER_SERVER_ENABLED,
  DOCUMENTS_UPLOAD_ENABLED: import.meta.env.VITE_DOCUMENTS_UPLOAD_ENABLED,
  PARTNER_UPGRADE_ENABLED: import.meta.env.VITE_PARTNER_UPGRADE_ENABLED,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
};

const parsed = Schema.safeParse(raw);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid env configuration', parsed.error.flatten());
  throw new Error('Invalid VITE_* environment configuration. See console for details.');
}

export const env = parsed.data;
export type Env = typeof env;
