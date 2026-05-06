import { toast } from 'sonner';
import { Loader2, Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useAppConfig, useUpdateAppConfig } from '@/features/admin/hooks/use-app-config';
import type { ApiError } from '@/api/errors';

// Simple accessible toggle switch — no external dep needed.
function Toggle({
  enabled,
  onChange,
  disabled,
  id,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      id={id}
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        enabled ? 'bg-brand' : 'bg-border',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

// Admin-only page — runtime feature flag toggles.
// All feature flags are defined in modules/admin/service.py APP_CONFIG_SCHEMA.
// Adding a new flag on the backend automatically surfaces it here.
export function AdminAppConfigPage() {
  const config = useAppConfig();
  const update = useUpdateAppConfig();

  const handleToggle = (key: string, enabled: boolean) => {
    update.mutate(
      { key, enabled },
      {
        onSuccess: (item) => {
          toast.success(`${item.label} ${item.enabled ? 'enabled' : 'disabled'}`);
        },
        onError: (err: ApiError) => {
          toast.error(err.userMessage);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">App Settings</h1>
        <p className="text-sm text-ink-muted">
          Toggle runtime features on or off without a deployment. Changes take effect immediately.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-ink-muted" aria-hidden />
            <CardTitle>Feature flags</CardTitle>
          </div>
          <CardDescription>
            Disabling a flag pauses that feature&apos;s background jobs and blocks new triggers.
            Existing data is never deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {config.isLoading ? (
            <div className="flex flex-col divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          ) : config.isError ? (
            <ErrorState error={config.error} onRetry={() => void config.refetch()} />
          ) : (
            <ul className="flex flex-col divide-y divide-border" role="list">
              {config.data?.items.map((item) => {
                const isUpdating = update.isPending && update.variables?.key === item.key;
                return (
                  <li key={item.key} className="flex items-start justify-between gap-4 py-4">
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor={`flag-${item.key}`}
                        className="text-sm font-medium text-ink-heading"
                      >
                        {item.label}
                        {isUpdating ? (
                          <Loader2
                            className="ml-2 inline-block h-3.5 w-3.5 animate-spin text-ink-muted"
                            aria-hidden
                          />
                        ) : null}
                      </label>
                      <p className="text-xs text-ink-muted">{item.description}</p>
                      {item.updated_at ? (
                        <p className="text-xs text-ink-muted">
                          Last changed{' '}
                          {new Date(item.updated_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-ink-muted">Default — never changed</p>
                      )}
                    </div>
                    <Toggle
                      id={`flag-${item.key}`}
                      enabled={item.enabled}
                      disabled={update.isPending}
                      onChange={(v) => handleToggle(item.key, v)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
