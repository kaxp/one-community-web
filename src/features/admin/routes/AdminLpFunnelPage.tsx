import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useLpFunnelStatus } from '@/features/admin/hooks/use-lp-funnel-status';
import { FunnelOverrideDialog } from '@/features/admin/components/FunnelOverrideDialog';
import { FUNNEL_INDEX, FUNNEL_LABEL } from '@/features/admin/lib/funnel-labels';
import { LP_FUNNEL_STATUSES, type LPFunnelStatus } from '@/features/admin/schemas';
import type { ApiError } from '@/api/errors';
import { isUuid } from '@/lib/zod-helpers';
import { PageHeader } from '@/components/layout/PageHeader';

interface ConflictState {
  attempted: LPFunnelStatus;
  current: LPFunnelStatus | null;
}

// PRD §7.12.5 — LP funnel detail page. There is NO GET endpoint for the
// caller's current funnel status; this page seeds "current" from the
// last-seen PUT response (or null) and lets the admin pick a target stage.
//
// 409 conflicts on a forward skip surface the FunnelOverrideDialog with
// the backend-supplied `current_status` + `attempted` fields; on confirm,
// we re-PUT with override=true.
export function AdminLpFunnelPage() {
  const { user_id } = useParams<{ user_id: string }>();
  const userId = user_id ?? '';
  const userIdValid = isUuid(userId);
  const mutation = useLpFunnelStatus();
  const [current, setCurrent] = useState<LPFunnelStatus | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  // issues.md [I-21] — guard against navigation with a non-UUID param so we
  // never PUT a malformed user_id and surface a confusing Zod parse failure.
  if (!userIdValid) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            to="/admin/lp-funnel"
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to picker
          </Link>
          <PageHeader title="LP funnel" />
        </div>
        <EmptyState
          title="Invalid user id"
          description={`"${userId}" is not a valid UUID. Pick an LP from the search picker, or paste a real user_id (8-4-4-4-12 hex).`}
          action={
            <Button asChild variant="outline">
              <Link to="/admin/lp-funnel">Back to picker</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const submit = (target: LPFunnelStatus, override = false) => {
    mutation.mutate(
      override
        ? { user_id: userId, status: target, override: true }
        : { user_id: userId, status: target },
      {
        onSuccess: (data) => {
          setCurrent(data.funnel_status);
          setConflict(null);
          const actions = data.auto_actions_triggered.length
            ? ` · ${data.auto_actions_triggered.join(', ')}`
            : '';
          toast.success(`Funnel set to ${FUNNEL_LABEL[data.funnel_status]}${actions}`);
        },
        onError: (err: ApiError) => {
          if (err.code === 'conflict') {
            const detail = err.detail as {
              current_status?: LPFunnelStatus;
              attempted?: LPFunnelStatus;
            } | null;
            setConflict({
              attempted: detail?.attempted ?? target,
              current: detail?.current_status ?? current,
            });
            // Sync our local "current" view to the backend's truth.
            if (detail?.current_status) {
              setCurrent(detail.current_status);
            }
            return;
          }
          if (err.code !== 'validation_error') {
            toast.error(err.userMessage);
          }
        },
      },
    );
  };

  const onPickStage = (target: LPFunnelStatus) => {
    submit(target, false);
  };

  const onOverrideConfirm = () => {
    if (!conflict) return;
    submit(conflict.attempted, true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/admin/lp-funnel"
          className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to picker
        </Link>
        <PageHeader title="LP funnel" subtitle={`User id: ${userId}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current stage</CardTitle>
          <CardDescription>
            The funnel stage isn&apos;t exposed via a GET; it updates here once you set it. The
            backend is the authority — a 409 will reset this to the server&apos;s value.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {current ? (
            <Badge variant="default" data-testid="lp-funnel-current">
              {FUNNEL_LABEL[current]}
            </Badge>
          ) : (
            <p className="text-sm text-ink-muted">Pick a target stage below to begin.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Move to…</CardTitle>
          <CardDescription>
            Each click sets the LP&apos;s funnel stage. Skipping forward (more than one stage)
            requires override; the dialog will prompt you on 409.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {LP_FUNNEL_STATUSES.map((s) => {
              const isCurrent = current === s;
              const isSkip = current !== null && FUNNEL_INDEX[s] - FUNNEL_INDEX[current] > 1;
              return (
                <Button
                  key={s}
                  variant={isCurrent ? 'secondary' : isSkip ? 'outline' : 'default'}
                  disabled={mutation.isPending || isCurrent || userId === ''}
                  onClick={() => onPickStage(s)}
                  data-testid={`lp-funnel-btn-${s}`}
                >
                  {FUNNEL_LABEL[s]}
                  {isSkip ? (
                    <span className="ml-1 text-[10px] text-ink-muted">(needs override)</span>
                  ) : null}
                </Button>
              );
            })}
          </div>
          {mutation.isError && mutation.error?.code !== 'conflict' ? (
            <div className="mt-4">
              <ErrorState error={mutation.error} compact />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <FunnelOverrideDialog
        open={conflict !== null}
        current={conflict?.current ?? null}
        attempted={conflict?.attempted ?? null}
        isPending={mutation.isPending}
        onConfirm={onOverrideConfirm}
        onClose={() => setConflict(null)}
      />
    </div>
  );
}
