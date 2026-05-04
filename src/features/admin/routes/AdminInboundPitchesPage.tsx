import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, FileSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { useAdminInboundPitches } from '@/features/admin/hooks/use-admin-inbound-pitches';
import { useAdminInboundPitchDetail } from '@/features/admin/hooks/use-admin-inbound-pitch-detail';
import type {
  InboundPitch,
  InboundPitchDetail,
  InboundPitchRange,
  InboundPitchSignal,
} from '@/features/admin/schemas';
import { INBOUND_PITCH_RANGES } from '@/features/admin/schemas';
import { fmtDateTime } from '@/lib/date';
import { cn } from '@/lib/cn';

// Signal badge — frontend color mapping per spec (not backend).
function signalVariant(
  signal: InboundPitchSignal | null,
): 'success' | 'warning' | 'error' | 'secondary' {
  if (signal === 'strong') return 'success';
  if (signal === 'moderate') return 'warning';
  if (signal === 'weak') return 'error';
  return 'secondary';
}

function SignalBadge({ signal }: { signal: InboundPitchSignal | null }) {
  return (
    <Badge variant={signalVariant(signal)} data-testid={`signal-badge-${signal ?? 'null'}`}>
      {signal ?? '—'}
    </Badge>
  );
}

function SourceChip({ channel }: { channel: InboundPitch['source_channel'] }) {
  if (!channel) return <span className="text-xs text-ink-muted">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        channel === 'web_form' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
      )}
    >
      {channel === 'web_form' ? 'Web form' : 'Email'}
    </span>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink-heading">{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-40 shrink-0 text-ink-muted">{label}</span>
      <span className="text-ink-body">{value}</span>
    </div>
  );
}

function StringList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-xs text-ink-muted">None noted.</span>;
  return (
    <ul className="ml-4 list-disc space-y-1 text-sm text-ink-body">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function PitchDetailDrawer({
  startupId,
  open,
  onClose,
}: {
  startupId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useAdminInboundPitchDetail(
    open ? startupId : null,
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-2xl"
        data-testid="pitch-detail-drawer"
      >
        <SheetTitle>{data?.company_name ?? 'Full evaluation'}</SheetTitle>

        {isLoading ? (
          <div className="mt-6 flex flex-col gap-3" data-testid="drawer-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-6">
            <ErrorState
              error={error}
              onRetry={() => {
                void refetch();
              }}
            />
          </div>
        ) : data ? (
          <DrawerContent detail={data} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DrawerContent({ detail }: { detail: InboundPitchDetail }) {
  const ev = detail.evaluation;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <DetailSection title="Founder contact">
        <DetailRow label="Name" value={detail.founder_name} />
        <DetailRow label="Email" value={detail.founder_email} />
        <DetailRow label="Phone" value={detail.founder_phone} />
        <DetailRow label="LinkedIn" value={detail.founder_linkedin} />
      </DetailSection>

      <DetailSection title="Company">
        <DetailRow label="Sector" value={detail.sector} />
        <DetailRow label="Stage" value={detail.stage} />
        <DetailRow label="Founded" value={detail.founding_year} />
        <DetailRow label="Team size" value={detail.team_size} />
        <DetailRow label="Website" value={detail.website_url} />
        {detail.one_liner ? (
          <p className="text-sm italic text-ink-body">&ldquo;{detail.one_liner}&rdquo;</p>
        ) : null}
        {detail.description ? <p className="text-sm text-ink-body">{detail.description}</p> : null}
      </DetailSection>

      <DetailSection title="Financials snapshot">
        <DetailRow label="Revenue model" value={detail.revenue_model} />
        <DetailRow
          label="Monthly revenue"
          value={
            detail.revenue_monthly != null ? `₹${detail.revenue_monthly.toLocaleString()}` : null
          }
        />
        <DetailRow
          label="Monthly burn"
          value={detail.burn_monthly != null ? `₹${detail.burn_monthly.toLocaleString()}` : null}
        />
        <DetailRow
          label="Runway"
          value={detail.runway_months != null ? `${detail.runway_months} months` : null}
        />
        <DetailRow
          label="Balance"
          value={
            detail.current_balance_inr != null
              ? `₹${detail.current_balance_inr.toLocaleString()}`
              : null
          }
        />
        <DetailRow
          label="Growth"
          value={detail.growth_pct != null ? `${detail.growth_pct}%` : null}
        />
        <DetailRow
          label="Gross margin"
          value={detail.gross_margin_pct != null ? `${detail.gross_margin_pct}%` : null}
        />
        <DetailRow label="Customers" value={detail.customer_count} />
        <DetailRow
          label="Funding target"
          value={detail.funding_target_cr != null ? `₹${detail.funding_target_cr} Cr` : null}
        />
      </DetailSection>

      {ev ? (
        <>
          <DetailSection title="Evaluation summary">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-muted">Signal</span>
              <SignalBadge signal={(ev.signal as InboundPitchSignal | null) ?? null} />
            </div>
            {ev.summary ? <p className="text-sm text-ink-body">{ev.summary}</p> : null}
          </DetailSection>

          {ev.financial_health ||
          ev.market_position ||
          ev.competitive_landscape ||
          ev.team_assessment ||
          ev.indian_ecosystem_signals ? (
            <DetailSection title="Detailed analysis">
              <DetailRow label="Financial health" value={ev.financial_health} />
              <DetailRow label="Market position" value={ev.market_position} />
              <DetailRow label="Competitive landscape" value={ev.competitive_landscape} />
              <DetailRow label="Team assessment" value={ev.team_assessment} />
              <DetailRow label="Indian ecosystem signals" value={ev.indian_ecosystem_signals} />
            </DetailSection>
          ) : null}

          <DetailSection title="Strengths">
            <StringList items={ev.strengths} />
          </DetailSection>

          <DetailSection title="Concerns">
            <StringList items={ev.concerns} />
          </DetailSection>

          <DetailSection title="Key risks">
            <StringList items={ev.key_risks} />
          </DetailSection>

          <DetailSection title="Recommended LP types">
            <StringList items={ev.recommended_lp_types} />
          </DetailSection>

          {ev.recommendation_rationale ? (
            <DetailSection title="Recommendation rationale">
              <p className="text-sm text-ink-body">{ev.recommendation_rationale}</p>
            </DetailSection>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-ink-muted" data-testid="empty-evaluation">
          No AI evaluation available yet for this pitch.
        </p>
      )}

      {detail.pitch_deck_url ? (
        <Button asChild size="sm" variant="outline" className="self-start">
          <a href={detail.pitch_deck_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
            View pitch deck
          </a>
        </Button>
      ) : null}
    </div>
  );
}

// Phase 7.2.f — admin inbound pitches console.
export function AdminInboundPitchesPage() {
  const [params, setParams] = useSearchParams();
  const rawRange = params.get('range');
  const range: InboundPitchRange =
    rawRange && (INBOUND_PITCH_RANGES as readonly string[]).includes(rawRange)
      ? (rawRange as InboundPitchRange)
      : 'weekly';

  const [drawerId, setDrawerId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminInboundPitches(range);

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const setRange = (next: InboundPitchRange) => {
    const sp = new URLSearchParams(params);
    sp.set('range', next);
    setParams(sp, { replace: true });
  };

  const columns = useMemo<ColumnDef<InboundPitch>[]>(
    () => [
      {
        id: 'company_name',
        header: 'Company',
        cell: ({ row }) => (
          <span className="font-semibold text-ink-heading">{row.original.company_name}</span>
        ),
      },
      {
        id: 'source_channel',
        header: 'Source',
        cell: ({ row }) => <SourceChip channel={row.original.source_channel} />,
      },
      {
        id: 'ai_signal',
        header: 'Signal',
        cell: ({ row }) => <SignalBadge signal={row.original.ai_signal} />,
      },
      {
        id: 'ai_pitch_score',
        header: 'Pitch score',
        cell: ({ row }) => (
          <span className="text-sm text-ink-body">
            {row.original.ai_pitch_score != null ? row.original.ai_pitch_score : '—'}
          </span>
        ),
      },
      {
        id: 'created_at',
        header: 'Submitted',
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{fmtDateTime(row.original.created_at)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const { notion_page_id, drive_folder_id, id } = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              {notion_page_id ? (
                <Button asChild size="sm" variant="outline" data-testid={`notion-${id}`}>
                  <a
                    href={`https://notion.so/${notion_page_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    <span>View Notion</span>
                  </a>
                </Button>
              ) : null}
              {drive_folder_id ? (
                <Button asChild size="sm" variant="outline" data-testid={`drive-${id}`}>
                  <a
                    href={`https://drive.google.com/drive/folders/${drive_folder_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    <span>Open Drive</span>
                  </a>
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setDrawerId(id)} data-testid={`eval-${id}`}>
                Full evaluation
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Inbound pitches</h1>
        <p className="text-sm text-ink-muted">
          AI-evaluated startup pitches received via web form and email.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Range filter">
        {INBOUND_PITCH_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              'min-h-9 rounded-full border px-4 py-1 text-sm font-medium capitalize transition-colors',
              r === range
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
            )}
            aria-pressed={r === range}
            data-testid={`range-${r}`}
          >
            {r}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pitches</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3" data-testid="pitches-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              error={error}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={items}
                getRowId={(r) => r.id}
                emptyState={
                  <EmptyState
                    icon={FileSearch}
                    title="No inbound pitches in this range"
                    description="Pitches received via web form or email will appear here."
                  />
                }
              />
              {hasNextPage ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    data-testid="load-more"
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <PitchDetailDrawer
        startupId={drawerId}
        open={drawerId !== null}
        onClose={() => setDrawerId(null)}
      />
    </div>
  );
}
