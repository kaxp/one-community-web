import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ArrowRight, Loader2, Newspaper, Plus, X } from 'lucide-react';
import { useController } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { ExecutionPanel } from '@/components/execution-panel';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useMyDigests } from '@/features/digest/hooks/use-my-digests';
import { useMyDigestPreferences } from '@/features/digest/hooks/use-my-digest-preferences';
import { useUpdateMyDigestPreferences } from '@/features/digest/hooks/use-update-my-digest-preferences';
import {
  DIGEST_FREQUENCIES,
  zPreferencesForm,
  type DigestFrequency,
  type MyDigestPreferences,
  type MyDigestRow,
  type PreferencesForm,
} from '@/features/digest/me-schemas';
import { can } from '@/lib/role-capabilities';
import { useUser } from '@/auth/use-auth';
import { cn } from '@/lib/cn';
import type { Control } from 'react-hook-form';

const SUGGESTED_TAGS = ['fintech', 'defence', 'saas', 'deep_tech', 'ai', 'climate'] as const;

const FREQUENCY_LABEL: Record<DigestFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  paused: 'Paused',
};

function DigestRowCard({ row, onClick }: { row: MyDigestRow; onClick: () => void }) {
  const subject = row.subject ?? row.digest_type.replace(/_/g, ' ');
  const relative = row.sent_at
    ? formatDistanceToNow(parseISO(row.sent_at), { addSuffix: true })
    : 'Unknown time';
  const fullDate = row.sent_at ? format(parseISO(row.sent_at), 'PPpp') : '';
  const snippet = row.html_snippet
    ? row.html_snippet.length > 280
      ? row.html_snippet.slice(0, 277) + '…'
      : row.html_snippet
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      data-testid={`digest-row-${row.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink-heading">{subject}</p>
        {row.segment ? <Badge variant="secondary">{row.segment}</Badge> : null}
      </div>
      {snippet ? <p className="mt-1 text-xs text-ink-muted line-clamp-2">{snippet}</p> : null}
      <p className="mt-2 text-[10px] text-ink-muted" title={fullDate}>
        Sent {relative}
      </p>
    </button>
  );
}

function DigestSnippetSheet({ row, onClose }: { row: MyDigestRow | null; onClose: () => void }) {
  const open = row !== null;
  const subject = row?.subject ?? row?.digest_type.replace(/_/g, ' ') ?? 'Digest preview';

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-2xl">
        <div className="flex flex-col gap-2 border-b border-border pb-3">
          <SheetTitle>{subject}</SheetTitle>
          <SheetDescription>
            <span className="inline-flex items-center gap-2">
              {row?.digest_type ? <Badge variant="secondary">{row.digest_type}</Badge> : null}
              {row?.segment ? <Badge variant="outline">{row.segment}</Badge> : null}
            </span>
          </SheetDescription>
        </div>
        {row?.html_snippet ? (
          <>
            <p className="whitespace-pre-line text-sm text-ink-body">{row.html_snippet}</p>
            <p className="text-xs text-ink-muted">
              Full digest preview becomes available once WhatsApp/email delivery is active.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">No preview available for this digest.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TagsField({ control }: { control: Control<PreferencesForm> }) {
  const { field } = useController({ name: 'interest_tags', control });
  const tags: string[] = field.value ?? [];
  const [customInput, setCustomInput] = useState('');

  const toggle = (tag: string) => {
    field.onChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  };

  const addCustom = () => {
    const t = customInput.trim().toLowerCase();
    if (!t || tags.includes(t)) {
      setCustomInput('');
      return;
    }
    field.onChange([...tags, t]);
    setCustomInput('');
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Topics of interest</Label>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
              tags.includes(tag)
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
            )}
            data-testid={`tag-chip-${tag}`}
          >
            {tag}
          </button>
        ))}
        {tags
          .filter((t) => !(SUGGESTED_TAGS as readonly string[]).includes(t))
          .map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
              data-testid={`tag-chip-${tag}`}
            >
              {tag}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add custom tag…"
          className="h-8 w-48 text-xs"
          data-testid="tag-custom-input"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="h-8 px-2"
          data-testid="tag-add-btn"
        >
          <Plus className="h-3 w-3" aria-hidden />
        </Button>
      </div>
      <p className="text-xs text-ink-muted">
        For LP / Potential LP roles, tags are also applied to your LP profile so the weekly
        generator picks them up. Server normalises (lowercase, dedupe, sort) on save.
      </p>
    </div>
  );
}

function PreferencesPanel({ prefs }: { prefs: MyDigestPreferences }) {
  const mutation = useUpdateMyDigestPreferences();

  return (
    <ExecutionPanel<PreferencesForm, MyDigestPreferences>
      title="Preferences"
      description="Control what you receive in your digest."
      schema={zPreferencesForm}
      defaultValues={{
        frequency: prefs.frequency,
        interest_tags: prefs.interest_tags,
        opted_in_wa: prefs.opted_in_wa,
      }}
      mutation={mutation}
      submitLabel="Save preferences"
      onSuccessToast={() => 'Preferences saved'}
      renderForm={({ register, control, formState }) => (
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink-heading">Frequency</legend>
            <div className="flex flex-wrap gap-2">
              {DIGEST_FREQUENCIES.map((freq) => (
                <Label
                  key={freq}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-muted"
                >
                  <input
                    type="radio"
                    value={freq}
                    {...register('frequency')}
                    data-testid={`freq-${freq}`}
                  />
                  {FREQUENCY_LABEL[freq]}
                </Label>
              ))}
            </div>
            {formState.errors.frequency ? (
              <p className="text-xs text-error" role="alert">
                {String(formState.errors.frequency.message ?? '')}
              </p>
            ) : null}
            <p className="text-[11px] text-ink-muted">
              Active when WhatsApp delivery launches. Preferences are stored now and honoured once
              the channel is live.
            </p>
          </fieldset>

          <TagsField control={control} />

          <Label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              {...register('opted_in_wa')}
              data-testid="opted-in-wa"
              className="h-4 w-4 accent-brand"
            />
            <span className="text-sm">Receive via WhatsApp</span>
          </Label>
        </div>
      )}
    />
  );
}

// PRD §7.13.5 / §7.13.6 / §7.13.7 + decisions.md [P-22] — user-side digest
// page. Replaces the Phase-4 blocker placeholder. Two-column layout:
//   Left  — cursor-paginated recent digests list.
//   Right — preferences form (frequency radio, topic chips, WA toggle).
// Admin link is conditionally rendered for admin / super_admin only.
export function MyDigestPage() {
  const user = useUser();
  const isAdmin = can(user?.role, 'admin.any');

  const list = useMyDigests({ limit: 20 });
  const prefsQuery = useMyDigestPreferences();

  const items = useMemo(() => (list.data?.pages ?? []).flatMap((p) => p.items), [list.data?.pages]);

  const [previewing, setPreviewing] = useState<MyDigestRow | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-ink-heading">My digest</h1>
          <p className="text-sm text-ink-muted">
            Your personalised weekly recap of community opportunities.
          </p>
        </div>
        {isAdmin ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/digest">
              Admin digest console
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent digests</CardTitle>
              <CardDescription>Tap a row to read the preview.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {list.isLoading ? (
                <div className="flex flex-col gap-3" data-testid="digests-loading">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : list.isError ? (
                <ErrorState
                  error={list.error}
                  onRetry={() => {
                    void list.refetch();
                  }}
                />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Newspaper}
                  title="Your first digest will land Monday morning."
                  description="Subscribe to topics you care about in the Preferences panel to personalise your recap."
                />
              ) : (
                <>
                  <ul className="flex flex-col gap-3" data-testid="digest-list">
                    {items.map((row) => (
                      <li key={row.id}>
                        <DigestRowCard row={row} onClick={() => setPreviewing(row)} />
                      </li>
                    ))}
                  </ul>
                  {list.hasNextPage ? (
                    <Button
                      variant="outline"
                      disabled={list.isFetchingNextPage}
                      onClick={() => list.fetchNextPage()}
                      data-testid="load-more"
                    >
                      {list.isFetchingNextPage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          <span>Loading…</span>
                        </>
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {prefsQuery.isLoading ? (
            <Skeleton className="h-72 w-full" data-testid="prefs-loading" />
          ) : prefsQuery.isError ? (
            <ErrorState
              error={prefsQuery.error}
              onRetry={() => {
                void prefsQuery.refetch();
              }}
            />
          ) : prefsQuery.data ? (
            <PreferencesPanel prefs={prefsQuery.data} />
          ) : null}
        </div>
      </div>

      <DigestSnippetSheet row={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}
