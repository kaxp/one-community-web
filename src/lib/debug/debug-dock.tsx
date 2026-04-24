// Dev-only debug dock. Tree-shaken out of production builds — never render in PROD.
import { useState } from 'react';
import { Bug, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { env } from '@/lib/env';
import { useAuthStore } from '@/auth/auth-store';

const TABS = ['session', 'flags'] as const;
type Tab = (typeof TABS)[number];

export function DebugDock() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('session');

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg hover:bg-brand-hover"
          aria-label="Open debug dock"
        >
          <Bug className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex w-96 flex-col rounded-lg border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold text-ink-heading">Debug</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close debug dock"
              className="text-ink-muted hover:text-ink-heading"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex border-b border-border">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium capitalize text-ink-body hover:bg-surface-muted',
                  tab === t && 'bg-brand/10 text-brand',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="max-h-64 overflow-auto p-3 text-xs text-ink-body">
            {tab === 'session' ? <SessionTab /> : <FlagsTab />}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionTab() {
  const { token, user, role, expiresAt } = useAuthStore((s) => ({
    token: s.token,
    user: s.user,
    role: s.role,
    expiresAt: s.expiresAt,
  }));
  return (
    <dl className="flex flex-col gap-1">
      <Row k="role" v={role ?? '—'} />
      <Row k="phone" v={user?.phone ?? '—'} />
      <Row k="name" v={user?.name ?? '—'} />
      <Row k="token" v={token ? `${token.slice(0, 16)}…` : '—'} />
      <Row k="expiresAt" v={expiresAt ? new Date(expiresAt).toLocaleString() : '—'} />
    </dl>
  );
}

function FlagsTab() {
  return (
    <dl className="flex flex-col gap-1">
      <Row k="APP_ENV" v={env.APP_ENV} />
      <Row k="API_BASE_URL" v={env.API_BASE_URL} />
      <Row k="MSW_ENABLED" v={String(env.MSW_ENABLED)} />
      <Row k="DEBUG_PANEL" v={String(env.DEBUG_PANEL)} />
      <Row k="OTP_BYPASS_HINT" v={String(env.OTP_BYPASS_HINT)} />
      <Row k="PROFILE_V1_ENABLED" v={String(env.PROFILE_V1_ENABLED)} />
      <Row k="OCR_SERVER_ENABLED" v={String(env.OCR_SERVER_ENABLED)} />
      <Row k="WHISPER_SERVER_ENABLED" v={String(env.WHISPER_SERVER_ENABLED)} />
      <Row k="DOCUMENTS_UPLOAD_ENABLED" v={String(env.DOCUMENTS_UPLOAD_ENABLED)} />
    </dl>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-ink-muted">{k}</dt>
      <dd className="font-mono text-ink-heading">{v}</dd>
    </div>
  );
}
