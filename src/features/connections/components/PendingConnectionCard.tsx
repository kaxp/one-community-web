import { Clock, Lock, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/role-badge';
import { InlineExecutionButton } from '@/components/execution-panel';
import { useRespondToConnection } from '@/features/connections/hooks/use-respond-to-connection';
import type { ApiError } from '@/api/errors';
import type { PendingConnection } from '@/features/connections/schemas';
import { fmtDate } from '@/lib/date';

interface Props {
  row: PendingConnection;
}

// One <Actions> instance per row so each row owns its mutation state. Concurrent
// clicks across rows don't share isPending. Toasts fire via per-call callbacks
// (only the clicked button toasts; sibling Decline button doesn't observe Accept's success).
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

function StatusPill({ row }: { row: PendingConnection }) {
  // Outgoing rows show one of two states. PRD §7.6.5 enumerates pending_admin
  // and pending_target as the two pending statuses; rejected_admin / declined
  // can also surface server-side, so we render them with a muted pill.
  if (row.status === 'pending_admin') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
        role="status"
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Awaiting admin
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
        Awaiting target
      </span>
    );
  }
  if (row.status === 'rejected_admin') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-error/30 bg-error/10 px-3 py-1 text-xs font-medium text-error"
        role="status"
      >
        Rejected
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
  return null;
}

export function PendingConnectionCard({ row }: Props) {
  const c = row.counterpart;
  // Incoming rows in pending_target get Accept/Decline. Anything else (incoming
  // pending_admin which is unusual but possible, or any outgoing row) shows the
  // status pill instead. Outgoing rows MUST NOT show Accept/Decline — those are
  // for the target, never the requester.
  const showActions = row.direction === 'incoming' && row.status === 'pending_target';

  return (
    <Card data-testid={`pending-${row.connection_id}`}>
      <CardContent className="flex flex-col gap-3 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink-heading">{c.name}</p>
            {c.organisation ? <p className="text-xs text-ink-muted">{c.organisation}</p> : null}
          </div>
          <RoleBadge role={c.role} className="self-start" />
        </header>

        {row.message ? (
          <p className="whitespace-pre-wrap rounded-md border border-border bg-surface-muted p-3 text-sm text-ink-body">
            {row.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">Sent {fmtDate(row.created_at)}</p>
          {showActions ? <Actions row={row} /> : <StatusPill row={row} />}
        </div>
      </CardContent>
    </Card>
  );
}
