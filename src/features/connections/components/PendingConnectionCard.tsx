import { Clock, Lock, Check, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InlineExecutionButton } from '@/components/execution-panel';
import { useRespondToConnection } from '@/features/connections/hooks/use-respond-to-connection';
import { useCancelConnection } from '@/features/connections/hooks/use-cancel-connection';
import type { ApiError } from '@/api/errors';
import type { PendingConnection } from '@/features/connections/schemas';
import { fmtDate } from '@/lib/date';

interface Props {
  row: PendingConnection;
}

// Derive a readable display name for the counterpart. Priority:
// 1. company_name (set for startups)
// 2. name (set for LPs/VCs who completed onboarding)
// 3. Role-based label so the card is still informative when onboarding is incomplete
function displayName(c: PendingConnection['counterpart']): string {
  if (c.company_name) return c.company_name;
  if (c.name) return c.name;
  const role = c.role;
  if (role === 'startup_inprogress' || role === 'startup_onboarded' || role === 'startup_funded')
    return 'Startup';
  if (role === 'lp') return 'LP';
  if (role === 'potential_lp') return 'Potential LP';
  if (role === 'vc') return 'VC';
  return 'Community member';
}

function Actions({ row }: { row: PendingConnection }) {
  const respond = useRespondToConnection();
  const errorToast = (err: ApiError) => {
    if (err.code === 'conflict') return 'This was already handled — refreshing';
    if (err.code === 'forbidden') return 'You can no longer respond to this request';
    return err.userMessage;
  };
  return (
    <div className="flex flex-wrap gap-2">
      <InlineExecutionButton
        size="sm"
        mutation={respond}
        input={{
          connection_id: row.connection_id,
          counterpart_id: row.counterpart.user_id,
          action: 'accept' as const,
        }}
        onSuccessToast={() => 'Connection accepted — contact details unlocked'}
        onErrorToast={errorToast}
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        <span>Accept</span>
      </InlineExecutionButton>
      <InlineExecutionButton
        size="sm"
        variant="outline"
        mutation={respond}
        input={{
          connection_id: row.connection_id,
          counterpart_id: row.counterpart.user_id,
          action: 'decline' as const,
        }}
        onSuccessToast={() => 'Declined'}
        onErrorToast={errorToast}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        <span>Decline</span>
      </InlineExecutionButton>
    </div>
  );
}

function CancelButton({ row }: { row: PendingConnection }) {
  const cancel = useCancelConnection();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-error hover:text-error hover:bg-error/10"
      disabled={cancel.isPending}
      onClick={() =>
        cancel.mutate(row.connection_id, {
          onSuccess: () => toast.success('Request withdrawn'),
          onError: (err) => toast.error(err.userMessage),
        })
      }
    >
      <X className="h-3.5 w-3.5" aria-hidden />
      Cancel request
    </Button>
  );
}

function StatusPill({ row }: { row: PendingConnection }) {
  if (row.status === 'pending_admin') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
        role="status"
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Awaiting admin approval
      </span>
    );
  }
  if (row.status === 'pending_target') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
        role="status"
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
        Awaiting response
      </span>
    );
  }
  if (row.status === 'rejected_admin') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-error/30 bg-error/10 px-3 py-1 text-xs font-medium text-error"
        role="status"
      >
        Not approved by admin
      </span>
    );
  }
  if (row.status === 'declined') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-ink-muted/30 bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted"
        role="status"
      >
        Declined
      </span>
    );
  }
  if (row.status === 'accepted') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success"
        role="status"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Connected
      </span>
    );
  }
  return null;
}

export function PendingConnectionCard({ row }: Props) {
  const c = row.counterpart;
  const navigate = useNavigate();
  const name = displayName(c);

  const showActions = row.direction === 'incoming' && row.status === 'pending_target';
  // Outgoing pending_admin requests can be cancelled (admin hasn't acted yet).
  const showCancel = row.direction === 'outgoing' && row.status === 'pending_admin';
  // Detect if the counterpart is a startup type to decide the detail route.
  const isStartup =
    c.role === 'startup_inprogress' ||
    c.role === 'startup_onboarded' ||
    c.role === 'startup_funded';

  const handleViewProfile = () => {
    navigate(`/search/profile/${c.user_id}`, {
      state: { targetType: isStartup ? 'startup' : 'lp' },
    });
  };

  return (
    <Card data-testid={`pending-${row.connection_id}`}>
      <CardContent className="flex flex-col gap-3 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={handleViewProfile}
              className="group flex items-center gap-1.5 text-left"
            >
              <p className="text-base font-semibold text-ink-heading group-hover:text-brand group-hover:underline">
                {name}
              </p>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </button>
            {/* Show user name as subtitle when company_name is the primary label */}
            {c.company_name && c.name ? <p className="text-xs text-ink-muted">{c.name}</p> : null}
            {c.organisation && !c.company_name ? (
              <p className="text-xs text-ink-muted">{c.organisation}</p>
            ) : null}
          </div>
          {/* Always show the counterpart type label so each card is self-explanatory */}
          <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
            {isStartup
              ? 'Startup'
              : c.role === 'lp'
                ? 'LP'
                : c.role === 'potential_lp'
                  ? 'Potential LP'
                  : c.role === 'vc'
                    ? 'VC'
                    : c.role}
          </span>
        </header>

        {row.message ? (
          <p className="whitespace-pre-wrap rounded-md border border-border bg-surface-muted p-3 text-sm text-ink-body">
            {row.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">
            {row.direction === 'outgoing' ? 'Sent' : 'Received'} {fmtDate(row.created_at)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {showActions ? <Actions row={row} /> : <StatusPill row={row} />}
            {showCancel ? <CancelButton row={row} /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
