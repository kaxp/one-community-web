/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_OTP_BYPASS_HINT: string;
  readonly VITE_MSW_ENABLED: string;
  readonly VITE_DEBUG_PANEL: string;
  readonly VITE_PROFILE_V1_ENABLED: string;
  readonly VITE_OCR_SERVER_ENABLED: string;
  readonly VITE_WHISPER_SERVER_ENABLED: string;
  readonly VITE_DOCUMENTS_UPLOAD_ENABLED: string;
  readonly VITE_PARTNER_UPGRADE_ENABLED: string;
  readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
