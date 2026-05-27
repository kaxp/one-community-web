import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { ExecutionPanel } from '@/components/execution-panel';
import { InlineExecutionButton } from '@/components/execution-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { useMatchGenerate } from '@/features/matchmaking/hooks/use-match-generate';
import { useMatchPending } from '@/features/matchmaking/hooks/use-match-pending';
import { useMatchApprove } from '@/features/matchmaking/hooks/use-match-approve';
import { getMatchJob } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { registerJob } from '@/lib/debug/use-job-registry';
import { useUser } from '@/auth/use-auth';
import { fmtScore, scoreBadgeVariant } from '@/features/matchmaking/lib/labels';
import {
  zMatchGenerateRequest,
  type MatchGenerateAck,
  type MatchGenerateRequest,
  type MatchGenerateResult,
  type MatchSuggestion,
} from '@/features/matchmaking/schemas';
import type { ApiError } from '@/api/errors';
import { PageHeader } from '@/components/layout/PageHeader';

function nextMonday(today = new Date()): string {
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  // If today is already a Monday, use it; otherwise the spec says "this
  // week" so we still clamp to the most recent Monday for backend grouping.
  return format(monday >= today ? monday : addDays(monday, 7), 'yyyy-MM-dd');
}

function clampToMonday(value: string): string {
  try {
    const monday = startOfWeek(parseISO(value), { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  } catch {
    return value;
  }
}

interface PendingTableProps {
  rows: MatchSuggestion[];
}

function PendingTable({ rows }: PendingTableProps) {
  const approve = useMatchApprove();
  const errorToast = (err: ApiError) => {
    if (err.code === 'conflict') return 'Already approved — refreshing';
    if (err.code === 'not_found') return 'Suggestion no longer exists';
    return err.userMessage;
  };

  // Group by week_of for readability per §7.8.4 transformation note.
  const grouped = useMemo(() => {
    const map = new Map<string, MatchSuggestion[]>();
    for (const r of rows) {
      const list = map.get(r.week_of) ?? [];
      list.push(r);
      map.set(r.week_of, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [rows]);

  const columns = useMemo<ColumnDef<MatchSuggestion>[]>(
    () => [
      {
        id: 'company',
        header: 'Counterpart',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-ink-heading">
              {row.original.company_name ?? row.original.id.slice(0, 8)}
            </span>
            {row.original.sector ? (
              <span className="text-xs text-ink-muted">{row.original.sector}</span>
            ) : null}
            {row.original.one_liner ? (
              <span className="line-clamp-1 text-xs text-ink-muted">{row.original.one_liner}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'score',
        header: 'Score',
        cell: ({ row }) => (
          <Badge variant={scoreBadgeVariant(row.original.score)}>
            {fmtScore(row.original.score)}
          </Badge>
        ),
      },
      {
        id: 'reason',
        header: 'Reason',
        cell: ({ row }) => (
          <p className="max-w-md text-xs text-ink-body line-clamp-2">
            {row.original.reason ?? <span className="italic text-ink-muted">No reason</span>}
          </p>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        // Reject action is intentionally absent — backend endpoint is not
        // exposed yet (PRD §7.8.4 transformation note "Reject currently
        // uses the same PATCH pattern (not yet exposed)"). Wire it when the
        // backend ships /matchmaking/{id}/reject.
        cell: ({ row }) => (
          <InlineExecutionButton
            size="sm"
            mutation={approve}
            input={{ suggestion_id: row.original.id }}
            onSuccessToast={() => 'Approved'}
            onErrorToast={errorToast}
            data-testid={`approve-${row.original.id}`}
          >
            Approve
          </InlineExecutionButton>
        ),
      },
    ],
    [approve],
  );

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([weekOf, weekRows]) => (
        <div key={weekOf} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Week of {weekOf}
          </h3>
          <DataTable columns={columns} data={weekRows} getRowId={(r) => r.id} />
        </div>
      ))}
    </div>
  );
}

// PRD §7.8.1–§7.8.4 — admin matchmaking ops. Top: Generate panel with
// jobPoll. Bottom: pending suggestions table grouped by week_of with
// Approve actions. Reject is a backend gap (TODO above).
export function AdminMatchmakingOpsPage() {
  const user = useUser();
  const qc = useQueryClient();
  const generate = useMatchGenerate();
  const pending = useMatchPending();
  const items = pending.data ?? [];

  // After a generate job lands SUCCESS, refetch pending so the new rows appear.
  useEffect(() => {
    const ack = generate.data;
    if (!ack) return;
    // The ExecutionPanel is the polling driver; its query key is a tuple
    // [...qk.matchmaking.jobAll, jobId]. We mirror the read so we can react
    // to SUCCESS once. The mirror itself doesn't fetch.
    const mirror = qc.getQueryData<{ ready?: boolean; successful?: boolean | null }>([
      ...qk.matchmaking.jobAll,
      ack.job_id,
    ]);
    if (mirror?.ready && mirror.successful) {
      void qc.invalidateQueries({ queryKey: qk.matchmaking.pending });
    }
  }, [generate.data, qc, pending.dataUpdatedAt]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Matchmaking ops"
        subtitle="Generate weekly suggestions and approve them for the LP / startup feeds."
      />

      <ExecutionPanel<MatchGenerateRequest, MatchGenerateResult, MatchGenerateAck>
        title="Generate this week"
        description="Pick a Monday for week_of. We clamp non-Monday dates client-side via date-fns startOfWeek({ weekStartsOn: 1 })."
        schema={zMatchGenerateRequest}
        defaultValues={{ week_of: nextMonday() }}
        mutation={generate}
        submitLabel="Generate"
        onSuccessToast={(result) =>
          `Generated ${result.generated_count} suggestions for week of ${result.week_of}`
        }
        jobPoll={{
          queryKey: qk.matchmaking.jobAll,
          queryFn: getMatchJob,
          intervalMs: 3000,
          maxPolls: 30,
        }}
        onJobAccepted={(_ack, jobId) => {
          registerJob({
            job_id: jobId,
            task_name: 'matchmaking.generate',
            submitted_by: user?.id ?? null,
          });
          // Also bounce a hint that the pending list will refresh once SUCCESS lands.
          toast.success('Generation queued — polling job…');
        }}
        renderForm={({ register, formState, setValue, watch }) => {
          const current = watch('week_of') ?? '';
          return (
            <FormField
              label="Week of (Monday)"
              htmlFor="match-week-of"
              error={formState.errors.week_of?.message}
              hint="Non-Monday selections are auto-clamped to the most recent Monday on submit."
            >
              <div className="flex items-center gap-2">
                <Input
                  id="match-week-of"
                  type="date"
                  className="w-48"
                  {...register('week_of', {
                    onChange: (e) => setValue('week_of', clampToMonday(e.target.value)),
                  })}
                />
                <span className="text-xs text-ink-muted">{current ? `→ ${current}` : ''}</span>
              </div>
            </FormField>
          );
        }}
        renderResult={(result) => (
          <div className="flex flex-col gap-2 text-sm text-ink-body">
            <p>
              <span className="font-semibold text-ink-heading">
                {result.generated_count} new pending suggestions
              </span>{' '}
              for week of {result.week_of}.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void qc.invalidateQueries({ queryKey: qk.matchmaking.pending })}
            >
              Refresh pending list
            </Button>
          </div>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending suggestions</CardTitle>
          <CardDescription>Approve to surface in the user-facing feed.</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="pending-suggestions-loading">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pending.isError ? (
            <ErrorState
              error={pending.error}
              onRetry={() => {
                void pending.refetch();
              }}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="No pending suggestions"
              description="Generate a week to seed the queue, then approve from this table."
            />
          ) : (
            <PendingTable rows={items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
